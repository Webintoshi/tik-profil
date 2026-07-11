import { Image } from "expo-image";
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";

import {
  resolveTikProfilAssetUrl,
  submitPublicFastFoodOrder,
  validatePublicFastFoodCoupon,
  type PublicFoodMenuData,
  type PublicFoodMenuExtra,
  type PublicFoodMenuExtraGroup,
  type PublicFoodMenuProduct,
  type PublicFastFoodOrderResponse
} from "@/api/kesfet";
import { CustomerApiError } from "@/api/customer";
import { useCustomerSession } from "@/auth/auth-store";
import type { FoodMenuKind } from "@/business/profile-actions";
import {
  applyCoupon,
  buildFastFoodOrderPayload,
  createCheckoutSubmitGuard,
  getPaymentMethodLabel,
  isDeliveryModeAvailable,
  listAvailablePaymentMethods,
  removeCoupon,
  resolveActiveProductPrice,
  resolveCheckoutIdempotency,
  resolveDeliveryMode,
  resolvePaymentMethod,
  validateCheckout,
  type AppliedCoupon,
  type CheckoutIdempotencyState,
  type CheckoutPrefill,
  type DeliveryType,
  type PaymentMethod
} from "@/checkout/checkout-state";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact } from "@/utils/haptics";
import { calculateFoodMenuPayableModel } from "./food-menu-pricing";
import {
  getCompactMenuMinHeight,
  getFoodQuantityDecreaseIcon,
  STICKY_CART_BAR_HEIGHT,
  STICKY_CART_GAP
} from "./menu-layout";

export type FoodOrderStep = "products" | "info" | "confirm" | "success";

export interface FoodSelectedExtra {
  groupId: string;
  id: string;
  name: string;
  priceModifier: number;
}

export interface FoodCartItem {
  key: string;
  productId: string;
  quantity: number;
  selectedExtras: FoodSelectedExtra[];
  unitPrice: number;
}

export interface FoodMenuController {
  cart: {
    itemCount: number;
    items: FoodCartItem[];
    subtotal: number;
  };
  cartItems: Record<string, FoodCartItem>;
  checkout: {
    coupon: AppliedCoupon | null;
    deliveryFee: number;
    deliveryType: DeliveryType;
    payableTotal: number;
    setCoupon: React.Dispatch<React.SetStateAction<AppliedCoupon | null>>;
    setDeliveryType: React.Dispatch<React.SetStateAction<DeliveryType>>;
    totals: ReturnType<typeof calculateFoodMenuPayableModel>["totals"];
  };
  clearCart: () => void;
  openCart: () => void;
  setCartItems: React.Dispatch<React.SetStateAction<Record<string, FoodCartItem>>>;
  setStep: React.Dispatch<React.SetStateAction<FoodOrderStep>>;
  step: FoodOrderStep;
}

interface FoodProductDetailState {
  product: PublicFoodMenuProduct;
  quantity: number;
  selections: Record<string, string[]>;
}

interface FoodSavedAddress {
  id: string;
  isDefault?: boolean;
  label: string;
  value: string;
}

export function useFoodMenuController({
  data,
  kind
}: {
  data: PublicFoodMenuData | null;
  kind: FoodMenuKind | null;
}): FoodMenuController {
  const [cartItems, setCartItems] = React.useState<Record<string, FoodCartItem>>({});
  const [step, setStep] = React.useState<FoodOrderStep>("products");
  const [deliveryType, setDeliveryType] = React.useState<DeliveryType>("delivery");
  const [storedCoupon, setStoredCoupon] = React.useState<AppliedCoupon | null>(null);
  const cart = React.useMemo(() => {
    const items = Object.values(cartItems);
    return {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      subtotal: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    };
  }, [cartItems]);
  const payableModel = React.useMemo(() => calculateFoodMenuPayableModel({
    coupon: storedCoupon,
    deliveryType,
    settings: data?.settings,
    subtotal: cart.subtotal
  }), [cart.subtotal, data?.settings, deliveryType, storedCoupon]);

  React.useEffect(() => {
    setCartItems({});
    setStoredCoupon(null);
    setStep("products");
  }, [data?.businessId, kind]);

  React.useEffect(() => {
    if (kind === "fastfood" && data?.settings?.cartEnabled !== false) return;
    setCartItems({});
    setStoredCoupon(null);
    setStep("products");
  }, [data?.settings?.cartEnabled, kind]);

  React.useEffect(() => {
    if (!data) return;
    setDeliveryType((current) => resolveDeliveryMode({
      deliveryEnabled: data.settings?.deliveryEnabled !== false,
      pickupEnabled: data.settings?.pickupEnabled !== false,
      preferred: current
    }));
  }, [data]);

  React.useEffect(() => {
    if (deliveryType === "pickup" && storedCoupon?.discountType === "free_delivery") {
      setStoredCoupon(null);
    }
  }, [deliveryType, storedCoupon?.discountType]);

  return {
    cart,
    cartItems,
    clearCart: () => setCartItems({}),
    checkout: {
      coupon: payableModel.coupon,
      deliveryFee: payableModel.deliveryFee,
      deliveryType,
      payableTotal: payableModel.totals.total,
      setCoupon: setStoredCoupon,
      setDeliveryType,
      totals: payableModel.totals
    },
    openCart: () => {
      if (cart.itemCount > 0) setStep("info");
    },
    setCartItems,
    setStep,
    step
  };
}

export function FoodMenuPanel({
  accessToken,
  controller,
  data,
  error,
  isLoading,
  kind,
  onOrderSuccess,
  onSelectCategory,
  prefill,
  savedAddresses,
  selectedCategoryId
}: {
  accessToken: string | null;
  controller: FoodMenuController;
  data: PublicFoodMenuData | null;
  error: string | null;
  isLoading: boolean;
  kind: FoodMenuKind;
  onOrderSuccess: () => Promise<void>;
  onSelectCategory: (categoryId: string) => void;
  prefill: CheckoutPrefill;
  savedAddresses: FoodSavedAddress[];
  selectedCategoryId: string | null;
}) {
  const actionColors = getActionColors();
  const { runAuthenticated } = useCustomerSession();
  const { height: screenHeight } = useWindowDimensions();
  const categories = React.useMemo(
    () => [...(data?.categories ?? [])].sort((first, second) => getCategoryOrder(first) - getCategoryOrder(second)),
    [data?.categories]
  );
  const allProducts = React.useMemo(() => {
    return [...(data?.products ?? [])]
      .filter((product) => product.inStock !== false)
      .sort((first, second) => getProductOrder(first) - getProductOrder(second));
  }, [data?.products]);
  const categorySections = React.useMemo(() => {
    const categoryIds = new Set(categories.map((category) => category.id));
    const sections = categories
      .map((category) => ({
        category,
        products: allProducts.filter((product) => product.categoryId === category.id)
      }))
      .filter((section) => section.products.length > 0);
    const uncategorizedProducts = allProducts.filter((product) => !product.categoryId || !categoryIds.has(product.categoryId));

    if (uncategorizedProducts.length) {
      sections.push({
        category: { icon: "🍽️", id: "__other", name: categories.length ? "Diğer" : "Menü" },
        products: uncategorizedProducts
      });
    }

  return sections;
  }, [allProducts, categories]);
  const activeCategoryId = selectedCategoryId || categorySections[0]?.category.id || categories[0]?.id || null;
  const activeCategoryRef = React.useRef(activeCategoryId);
  const menuScrollRef = React.useRef<ScrollView | null>(null);
  const categoryOffsetsRef = React.useRef<Record<string, number>>({});
  const { cartItems, setCartItems, setStep, step } = controller;
  const {
    coupon: appliedCoupon,
    deliveryFee,
    deliveryType,
    setCoupon: setAppliedCoupon,
    setDeliveryType,
    totals
  } = controller.checkout;
  const [productDetail, setProductDetail] = React.useState<FoodProductDetailState | null>(null);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(prefill.selectedAddressId);
  const [isAddingAddress, setIsAddingAddress] = React.useState(prefill.addressMode === "new");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | null>("cash");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCouponLoading, setIsCouponLoading] = React.useState(false);
  const [couponMessage, setCouponMessage] = React.useState<string | null>(null);
  const [orderNumber, setOrderNumber] = React.useState("");
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    address: prefill.address,
    couponCode: "",
    name: prefill.name,
    notes: "",
    phone: prefill.phone
  });
  const submitGuardRef = React.useRef(createCheckoutSubmitGuard());
  const idempotencyStateRef = React.useRef<CheckoutIdempotencyState | null>(null);

  const settings = data?.settings;
  const cartEnabled = kind === "fastfood" && settings?.cartEnabled !== false;
  const pickupEnabled = settings?.pickupEnabled !== false;
  const deliveryEnabled = settings?.deliveryEnabled !== false;
  const cashPayment = settings?.cashPayment !== false;
  const cardOnDelivery = settings?.cardOnDelivery !== false;
  const onlinePayment = settings?.onlinePayment === true;
  const availablePaymentMethods = listAvailablePaymentMethods({
    cardEnabled: cardOnDelivery,
    cashEnabled: cashPayment,
    onlineEnabled: onlinePayment
  });
  const minOrderAmount = settings?.minOrderAmount ?? 0;

  const getProductExtraGroups = React.useCallback((product: PublicFoodMenuProduct) => {
    const groupIds = product.extraGroupIds ?? [];
    if (!groupIds.length || !data?.extraGroups?.length) {
      return [];
    }

    return data.extraGroups
      .filter((group) => groupIds.includes(group.id))
      .map((group) => ({
        ...group,
        extras: group.extras?.length
          ? group.extras
          : (data.extras ?? []).filter((extra) => extra.groupId === group.id)
      }))
      .sort((first, second) => {
        if (first.isRequired !== second.isRequired) {
          return first.isRequired ? -1 : 1;
        }
        return groupIds.indexOf(first.id) - groupIds.indexOf(second.id) || (first.order ?? 0) - (second.order ?? 0);
      });
  }, [data?.extraGroups, data?.extras]);

  const hasProductOptions = React.useCallback((product: PublicFoodMenuProduct) => {
    return getProductExtraGroups(product).some((group) => group.extras.length > 0);
  }, [getProductExtraGroups]);

  React.useEffect(() => {
    setCartItems({});
    setProductDetail(null);
    setStep("products");
    setOrderNumber("");
    setOrderError(null);
    setAppliedCoupon(null);
    setCouponMessage(null);
  }, [data?.businessId, kind]);

  React.useEffect(() => {
    if (cartEnabled) return;
    setCartItems({});
    setProductDetail(null);
    setStep("products");
  }, [cartEnabled]);

  React.useEffect(() => {
    if (!data) return;

    setDeliveryType((current) => resolveDeliveryMode({
      deliveryEnabled,
      pickupEnabled,
      preferred: current ?? undefined
    }));
    setPaymentMethod((current) => resolvePaymentMethod({
      cardEnabled: cardOnDelivery,
      cashEnabled: cashPayment,
      onlineEnabled: onlinePayment,
      preferred: current ?? undefined
    }));
  }, [cardOnDelivery, cashPayment, data, deliveryEnabled, onlinePayment, pickupEnabled]);

  React.useEffect(() => {
    setSelectedAddressId(prefill.selectedAddressId);
    setIsAddingAddress(prefill.addressMode === "new");
    setForm((current) => ({
      ...current,
      address: prefill.address,
      name: prefill.name,
      phone: prefill.phone
    }));
  }, [data?.businessId, prefill]);

  const cartRows = React.useMemo(() => {
    if (!data) return [];

    const productsById = new Map(data.products.map((product) => [product.id, product]));

    return Object.values(cartItems)
      .map((item) => {
        const product = productsById.get(item.productId);
        if (!product || !item.quantity) return null;
        return {
          key: item.key,
          product,
          quantity: item.quantity,
          selectedExtras: item.selectedExtras,
          total: item.unitPrice * item.quantity,
          unitPrice: item.unitPrice
        };
      })
      .filter((item): item is { key: string; product: PublicFoodMenuProduct; quantity: number; selectedExtras: FoodSelectedExtra[]; total: number; unitPrice: number } => Boolean(item));
  }, [cartItems, data]);

  const productQuantities = React.useMemo(() => {
    return cartRows.reduce<Record<string, number>>((summary, item) => {
      summary[item.product.id] = (summary[item.product.id] ?? 0) + item.quantity;
      return summary;
    }, {});
  }, [cartRows]);

  const subtotal = controller.cart.subtotal;
  const total = totals.total;
  const cartCount = cartRows.reduce((sum, item) => sum + item.quantity, 0);
  const hasMinimumOrder = minOrderAmount <= 0 || subtotal >= minOrderAmount;
  const checkoutValidation = validateCheckout({
    address: form.address,
    deliveryType,
    items: cartRows.map((item) => ({
      available: item.product.inStock !== false,
      productId: item.product.id,
      quantity: item.quantity
    })),
    minOrderAmount,
    name: form.name,
    phone: form.phone,
    subtotal
  });
  const deliveryModeAvailable = isDeliveryModeAvailable(deliveryType, { deliveryEnabled, pickupEnabled });
  const canSubmitOrder = cartEnabled && checkoutValidation === null && deliveryModeAvailable && paymentMethod !== null;
  const couponCartKey = `${subtotal}:${cartRows.map((item) => `${item.product.id}:${item.quantity}`).join("|")}`;
  const menuViewportHeight = getCompactMenuMinHeight(screenHeight);
  const orderFormMaxHeight = Math.max(430, Math.round(screenHeight * 0.62));

  React.useEffect(() => {
    activeCategoryRef.current = activeCategoryId;
  }, [activeCategoryId]);

  React.useEffect(() => {
    setAppliedCoupon(null);
    setCouponMessage(null);
  }, [couponCartKey]);

  React.useEffect(() => {
    if (deliveryType === "pickup") setCouponMessage(null);
  }, [deliveryType]);

  function createInitialSelections(product: PublicFoodMenuProduct) {
    return getProductExtraGroups(product).reduce<Record<string, string[]>>((initial, group) => {
      const defaults = group.extras.filter((extra) => extra.isDefault).map((extra) => extra.id);
      initial[group.id] = group.selectionType === "single" ? defaults.slice(0, 1) : defaults.slice(0, group.maxSelections || defaults.length);
      return initial;
    }, {});
  }

  function getSelectedExtras(product: PublicFoodMenuProduct, selections: Record<string, string[]>) {
    return getProductExtraGroups(product).flatMap((group) => {
      const selectedIds = selections[group.id] ?? [];
      return group.extras
        .filter((extra) => selectedIds.includes(extra.id))
        .map((extra) => ({
          groupId: group.id,
          id: extra.id,
          name: extra.name,
          priceModifier: extra.priceModifier ?? 0
        }));
    });
  }

  function isProductSelectionValid(product: PublicFoodMenuProduct, selections: Record<string, string[]>) {
    return getProductExtraGroups(product).every((group) => {
      if (!group.isRequired) {
        return true;
      }
      return (selections[group.id] ?? []).length > 0;
    });
  }

  function addConfiguredProduct(product: PublicFoodMenuProduct, quantity: number, selectedExtras: FoodSelectedExtra[]) {
    if (!cartEnabled) return;

    lightImpact();
    const sortedExtraIds = selectedExtras.map((extra) => extra.id).sort();
    const key = [product.id, ...sortedExtraIds].join("::");
    const extraTotal = selectedExtras.reduce((sum, extra) => sum + (extra.priceModifier ?? 0), 0);
    const unitPrice = resolveActiveProductPrice(product) + extraTotal;

    setCartItems((current) => ({
      ...current,
      [key]: {
        key,
        productId: product.id,
        quantity: (current[key]?.quantity ?? 0) + quantity,
        selectedExtras,
        unitPrice
      }
    }));
  }

  function openProductDetail(product: PublicFoodMenuProduct) {
    if (!cartEnabled) return;

    lightImpact();
    setProductDetail({
      product,
      quantity: 1,
      selections: createInitialSelections(product)
    });
  }

  function addProductToCart(product: PublicFoodMenuProduct) {
    if (hasProductOptions(product)) {
      openProductDetail(product);
      return;
    }

    addConfiguredProduct(product, 1, []);
  }

  function addProductDetailToCart() {
    if (!productDetail || !isProductSelectionValid(productDetail.product, productDetail.selections)) {
      lightImpact();
      return;
    }

    addConfiguredProduct(
      productDetail.product,
      productDetail.quantity,
      getSelectedExtras(productDetail.product, productDetail.selections)
    );
    setProductDetail(null);
  }

  function removeProductFromCart(productId: string) {
    lightImpact();
    setCartItems((current) => {
      const next = { ...current };
      const matchingItem = Object.values(next).reverse().find((item) => item.productId === productId);

      if (!matchingItem) {
        return next;
      }

      const nextQuantity = Math.max(0, matchingItem.quantity - 1);
      if (nextQuantity) {
        next[matchingItem.key] = { ...matchingItem, quantity: nextQuantity };
      } else {
        delete next[matchingItem.key];
      }

      return next;
    });
  }

  function toggleProductExtra(group: PublicFoodMenuExtraGroup, extra: PublicFoodMenuExtra) {
    setProductDetail((current) => {
      if (!current) return current;

      const selectedIds = current.selections[group.id] ?? [];
      const isSelected = selectedIds.includes(extra.id);
      const isSingle = group.selectionType === "single";
      const maxSelections = group.maxSelections && group.maxSelections > 0 ? group.maxSelections : Number.POSITIVE_INFINITY;
      let nextSelectedIds: string[];

      if (isSingle) {
        nextSelectedIds = isSelected && !group.isRequired ? [] : [extra.id];
      } else if (isSelected) {
        nextSelectedIds = selectedIds.filter((id) => id !== extra.id);
      } else if (selectedIds.length < maxSelections) {
        nextSelectedIds = [...selectedIds, extra.id];
      } else {
        nextSelectedIds = selectedIds;
      }

      return {
        ...current,
        selections: {
          ...current.selections,
          [group.id]: nextSelectedIds
        }
      };
    });
  }

  function selectSavedAddress(address: FoodSavedAddress) {
    lightImpact();
    setIsAddingAddress(false);
    setSelectedAddressId(address.id);
    setForm((current) => ({ ...current, address: address.value }));
  }

  function startAddingAddress() {
    lightImpact();
    setIsAddingAddress(true);
    setSelectedAddressId(null);
    setForm((current) => ({ ...current, address: "" }));
  }

  async function applyCheckoutCoupon() {
    const code = form.couponCode.trim();
    if (!data || !code || !cartRows.length || isCouponLoading) return;

    setIsCouponLoading(true);
    setCouponMessage(null);
    try {
      const response = await validatePublicFastFoodCoupon({
        businessId: data.businessId,
        categoryIds: [...new Set(cartRows.map((item) => item.product.categoryId).filter((id): id is string => Boolean(id)))],
        code,
        customerPhone: form.phone.trim() || undefined,
        productIds: [...new Set(cartRows.map((item) => item.product.id))],
        subtotal
      });
      if (!response.valid) {
        setAppliedCoupon(null);
        setCouponMessage(response.message || "Kupon kullanılamadı");
        return;
      }

      const coupon = applyCoupon({
        ...response,
        discount: response.coupon?.discountType === "free_delivery" ? deliveryFee : response.discount
      }, subtotal + deliveryFee);
      setAppliedCoupon(coupon);
      setCouponMessage(coupon?.message || response.message || "Kupon uygulandı");
    } finally {
      setIsCouponLoading(false);
    }
  }

  function clearCheckoutCoupon() {
    setAppliedCoupon(removeCoupon());
    setCouponMessage(null);
    setForm((current) => ({ ...current, couponCode: "" }));
  }

  function scrollToCategory(categoryId: string) {
    lightImpact();
    onSelectCategory(categoryId);
    const offset = categoryOffsetsRef.current[categoryId] ?? 0;
    menuScrollRef.current?.scrollTo({ animated: true, y: Math.max(offset - spacing.sm, 0) });
  }

  function handleMenuScroll(event: { nativeEvent: { contentOffset: { y: number } } }) {
    const scrollY = event.nativeEvent.contentOffset.y + spacing.lg;
    const activeSection = categorySections
      .map((section) => ({
        id: section.category.id,
        offset: categoryOffsetsRef.current[section.category.id]
      }))
      .filter((item): item is { id: string; offset: number } => typeof item.offset === "number")
      .reduce<{ id: string; offset: number } | null>((current, item) => {
        if (item.offset <= scrollY && (!current || item.offset >= current.offset)) {
          return item;
        }
        return current;
      }, null);

    if (activeSection && activeSection.id !== activeCategoryRef.current) {
      activeCategoryRef.current = activeSection.id;
      onSelectCategory(activeSection.id);
    }
  }

  async function submitFastFoodOrder() {
    if (!data || !canSubmitOrder || !paymentMethod || submitGuardRef.current.isSubmitting()) {
      lightImpact();
      return;
    }

    setIsSubmitting(true);
    setOrderError(null);

    try {
      const payloadInput = {
        address: form.address,
        businessId: data.businessId,
        coupon: appliedCoupon,
        deliveryType,
        paymentMethod,
        items: cartRows.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          selectedExtras: item.selectedExtras.map((extra) => ({
            id: extra.id,
            name: extra.name,
            priceModifier: extra.priceModifier
          })),
          totalPrice: item.total,
          unitPrice: item.unitPrice
        })),
        note: form.notes,
        name: form.name,
        phone: form.phone,
        totals
      };
      const idempotency = resolveCheckoutIdempotency(idempotencyStateRef.current, JSON.stringify(payloadInput));
      idempotencyStateRef.current = idempotency.state;
      const orderPayload = buildFastFoodOrderPayload({
        ...payloadInput,
        idempotencyKey: idempotency.key
      });
      const guarded = await submitGuardRef.current.run<PublicFastFoodOrderResponse | undefined>(() => accessToken
        ? runAuthenticated((token) => submitPublicFastFoodOrder(orderPayload, token))
        : submitPublicFastFoodOrder(orderPayload));

      if (!guarded.accepted) return;
      const response = guarded.value;
      if (!response) {
        setOrderError("Siparis gonderilemedi");
        return;
      }

      if (response?.success && response.orderId && response.orderNumber && response.status) {
        setOrderNumber(response.orderNumber);
        setCartItems({});
        setAppliedCoupon(null);
        idempotencyStateRef.current = null;
        setStep("success");
        if (accessToken) await onOrderSuccess();
        lightImpact();
        return;
      }

      setOrderError(response.error || "Sipariş gönderilemedi");
    } catch (error) {
      setOrderError(error instanceof CustomerApiError ? error.message : "Sipariş gönderilemedi");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFooterPress() {
    lightImpact();

    if (step === "products") {
      setStep("info");
      return;
    }

    if (step === "info") {
      if (canSubmitOrder) setStep("confirm");
      return;
    }

    if (step === "confirm") {
      submitFastFoodOrder();
    }
  }

  const footerDisabled = isSubmitting || (step !== "products" && !canSubmitOrder);
  const detailExtraGroups = productDetail ? getProductExtraGroups(productDetail.product) : [];
  const detailSelectedExtras = productDetail ? getSelectedExtras(productDetail.product, productDetail.selections) : [];
  const detailBasePrice = productDetail ? resolveActiveProductPrice(productDetail.product) : 0;
  const detailUnitPrice = detailBasePrice + detailSelectedExtras.reduce((sum, extra) => sum + extra.priceModifier, 0);
  const detailTotal = detailUnitPrice * (productDetail?.quantity ?? 1);
  const detailSelectionValid = productDetail ? isProductSelectionValid(productDetail.product, productDetail.selections) : false;

  return (
    <>
      <View
        testID="food-menu-panel"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 24,
          borderWidth: 1,
          minHeight: menuViewportHeight,
          overflow: "hidden",
          ...shadows.soft
        }}
      >
      {isLoading ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          <Text style={{ ...typography.label, color: colors.ink }}>Menü yükleniyor...</Text>
          {[0, 1, 2].map((item) => (
            <View
              key={item}
              style={{
                backgroundColor: colors.backgroundAlt,
                borderRadius: radii.lg,
                height: 82,
                opacity: 0.86
              }}
            />
          ))}
        </View>
      ) : step === "success" ? (
        <View style={{ alignItems: "center", gap: spacing.md, padding: spacing.xl }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.brandSoft,
              borderRadius: radii.pill,
              height: 64,
              justifyContent: "center",
              width: 64
            }}
          >
            <Icon name="verified" color={colors.brand} size={34} />
          </View>
          <Text style={{ ...typography.title, color: colors.ink, textAlign: "center" }}>Siparişiniz alındı</Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>
            Sipariş numaranız: {orderNumber}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOrderNumber("");
              setStep("products");
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: colors.brand,
              borderRadius: radii.xl,
              justifyContent: "center",
              minHeight: 50,
              opacity: pressed ? 0.9 : 1,
              paddingHorizontal: spacing.xl
            })}
          >
            <Text style={{ ...typography.button, color: colors.onBrand }}>Menüye dön</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={{ gap: spacing.sm, padding: spacing.lg }}>
          <Text style={{ ...typography.title, color: colors.ink, fontSize: 17 }}>Menü açılamadı</Text>
          <Text style={{ ...typography.body, color: colors.muted }}>{error}</Text>
        </View>
      ) : data && step === "products" ? (
        <>
          <ScrollView horizontal contentContainerStyle={{ gap: spacing.sm, padding: spacing.md }} showsHorizontalScrollIndicator={false}>
            {categorySections.map(({ category }) => {
              const isActive = category.id === activeCategoryId;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => scrollToCategory(category.id)}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: isActive ? actionColors.order.bg : colors.brandSoft,
                    borderRadius: radii.pill,
                    flexDirection: "row",
                    gap: spacing.xs,
                    minHeight: 44,
                    opacity: pressed ? 0.9 : 1,
                    paddingHorizontal: spacing.md
                  })}
                >
                  {category.icon ? <Text style={{ fontSize: 15 }}>{category.icon}</Text> : null}
                  <Text style={{ ...typography.label, color: isActive ? actionColors.order.fg : colors.ink }}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            ref={menuScrollRef}
            contentContainerStyle={{
              gap: spacing.lg,
              padding: spacing.md,
              paddingBottom: spacing.md + (cartRows.length > 0 ? STICKY_CART_BAR_HEIGHT + STICKY_CART_GAP : 0),
              paddingTop: spacing.sm
            }}
            nestedScrollEnabled
            onScroll={handleMenuScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={false}
            style={cartEnabled ? { height: menuViewportHeight, minHeight: menuViewportHeight } : undefined}
            testID="food-menu-scroll"
          >
            {categorySections.length ? (
              categorySections.map((section) => {
                const [featuredProduct, ...restProducts] = section.products;

                return (
                  <View
                    key={section.category.id}
                    onLayout={(event) => {
                      categoryOffsetsRef.current[section.category.id] = event.nativeEvent.layout.y;
                    }}
                    style={{ gap: spacing.sm }}
                  >
                    <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                        {section.category.icon ? <Text style={{ fontSize: 15 }}>{section.category.icon}</Text> : null}
                        <Text style={{ ...typography.title, color: colors.ink, fontSize: 15 }}>
                          {section.category.name}
                        </Text>
                      </View>
                      <Text style={{ ...typography.small, color: colors.brand, fontWeight: "900" }}>
                        {section.products.length} ürün
                      </Text>
                    </View>

                    {featuredProduct ? (
                      <FeaturedFoodOrderProductCard
                        canOrder={cartEnabled}
                        onAdd={() => addProductToCart(featuredProduct)}
                        onRemove={() => removeProductFromCart(featuredProduct.id)}
                        product={featuredProduct}
                        quantity={productQuantities[featuredProduct.id] ?? 0}
                        showPrice={kind === "fastfood"}
                      />
                    ) : null}

                    {restProducts.length ? (
                      <View style={{ gap: spacing.sm }}>
                        {restProducts.map((product) => (
                          <CompactFoodOrderProductCard
                            key={product.id}
                            canOrder={cartEnabled}
                            onAdd={() => addProductToCart(product)}
                            onRemove={() => removeProductFromCart(product.id)}
                            product={product}
                            quantity={productQuantities[product.id] ?? 0}
                            showPrice={kind === "fastfood"}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <Text style={{ ...typography.body, color: colors.muted }}>Bu menüde ürün yok.</Text>
            )}
          </ScrollView>
        </>
      ) : data && step === "info" ? (
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: orderFormMaxHeight }}
          testID="food-order-form-scroll"
        >
          {(pickupEnabled || deliveryEnabled) ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.small, color: colors.mutedStrong }}>Teslimat şekli</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <FoodDeliveryModeCard
                  active={deliveryType === "delivery"}
                  disabled={!deliveryEnabled}
                  icon="location"
                  label="Adrese teslim"
                  meta={deliveryEnabled ? "Adres seç" : "Kapalı"}
                  onPress={() => {
                    if (!deliveryEnabled) return;
                    setDeliveryType("delivery");
                    const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId) ?? savedAddresses[0];
                    if (selectedAddress) {
                      setIsAddingAddress(false);
                      setSelectedAddressId(selectedAddress.id);
                      setForm((current) => ({ ...current, address: selectedAddress.value }));
                    } else {
                      setIsAddingAddress(true);
                    }
                  }}
                />
                <FoodDeliveryModeCard
                  active={deliveryType === "pickup"}
                  disabled={!pickupEnabled}
                  icon="store"
                  label="Mağaza teslim"
                  meta={pickupEnabled ? "Şubeden al" : "Kapalı"}
                  onPress={() => {
                    if (!pickupEnabled) return;
                    setDeliveryType("pickup");
                  }}
                />
              </View>
            </View>
          ) : null}
          {deliveryType === "delivery" ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }}>
                <Text style={{ ...typography.small, color: colors.mutedStrong }}>Teslimat adresi</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={startAddingAddress}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: isAddingAddress ? colors.brand : colors.brandSoft,
                    borderRadius: radii.pill,
                    flexDirection: "row",
                    gap: 5,
                    opacity: pressed ? 0.9 : 1,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 7
                  })}
                >
                  <Icon name="plus" color={isAddingAddress ? colors.onBrand : colors.brand} size={13} strokeWidth={3} />
                  <Text style={{ ...typography.small, color: isAddingAddress ? colors.onBrand : colors.brand, fontWeight: "800" }}>
                    Yeni adres ekle
                  </Text>
                </Pressable>
              </View>
              {savedAddresses.map((address) => (
                <FoodSavedAddressCard
                  address={address}
                  isSelected={!isAddingAddress && selectedAddressId === address.id}
                  key={address.id}
                  onPress={() => selectSavedAddress(address)}
                />
              ))}
              {isAddingAddress || !savedAddresses.length ? (
                <FoodCheckoutInput label="Yeni adres" multiline testID="food-address-input" value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} />
              ) : null}
            </View>
          ) : null}
          <FoodCheckoutInput label="Ad Soyad" testID="food-name-input" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
          <FoodCheckoutInput label="Telefon" keyboardType="phone-pad" testID="food-phone-input" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <View style={{ gap: spacing.sm }}>
            <Text style={{ ...typography.small, color: colors.mutedStrong }}>Kupon</Text>
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <FoodCheckoutInput
                  autoCapitalize="characters"
                  label="Kupon kodu"
                  testID="food-coupon-input"
                  value={form.couponCode}
                  onChangeText={(value) => setForm((current) => ({ ...current, couponCode: value }))}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isCouponLoading || !form.couponCode.trim() || !cartRows.length}
                onPress={appliedCoupon ? clearCheckoutCoupon : () => void applyCheckoutCoupon()}
                style={({ pressed }) => ({
                  alignItems: "center",
                  backgroundColor: appliedCoupon ? colors.backgroundAlt : colors.brandSoft,
                  borderRadius: radii.lg,
                  justifyContent: "center",
                  minHeight: 48,
                  opacity: pressed || isCouponLoading ? 0.7 : 1,
                  paddingHorizontal: spacing.md
                })}
              >
                <Text style={{ ...typography.label, color: colors.brand }}>
                  {isCouponLoading ? "Kontrol" : appliedCoupon ? "Kaldır" : "Uygula"}
                </Text>
              </Pressable>
            </View>
            {couponMessage ? (
              <Text style={{ ...typography.small, color: appliedCoupon ? colors.brand : colors.coral }}>{couponMessage}</Text>
            ) : null}
          </View>
          {availablePaymentMethods.length ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.small, color: colors.mutedStrong }}>Ödeme yöntemi</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {availablePaymentMethods.includes("cash") ? (
                  <FoodOrderChoiceButton active={paymentMethod === "cash"} icon="store" label="Nakit" onPress={() => setPaymentMethod("cash")} />
                ) : null}
                {availablePaymentMethods.includes("card") ? (
                  <FoodOrderChoiceButton active={paymentMethod === "card"} icon="ticket" label="Kart" onPress={() => setPaymentMethod("card")} />
                ) : null}
                {availablePaymentMethods.includes("online") ? (
                  <FoodOrderChoiceButton active={paymentMethod === "online"} icon="lock" label="Online ödeme" onPress={() => setPaymentMethod("online")} />
                ) : null}
              </View>
            </View>
          ) : null}
          <FoodCheckoutInput label="Sipariş notu" multiline testID="food-notes-input" value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} />
        </ScrollView>
      ) : data && step === "confirm" ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          {cartRows.map((item) => (
            <View key={item.key} style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ ...typography.body, color: colors.ink }}>
                  {item.quantity} x {item.product.name}
                </Text>
                {item.selectedExtras.length ? (
                  <Text style={{ ...typography.small, color: colors.muted, lineHeight: 17 }}>
                    {item.selectedExtras.map((extra) => `${extra.name}${extra.priceModifier > 0 ? ` (+${formatMenuPrice(extra.priceModifier)})` : ""}`).join(", ")}
                  </Text>
                ) : null}
              </View>
              <Text style={{ ...typography.label, color: colors.ink }}>{formatMenuPrice(item.total)}</Text>
            </View>
          ))}
          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md }}>
            <FoodSummaryRow label="Ara toplam" value={formatMenuPrice(subtotal)} />
            {deliveryType === "delivery" ? <FoodSummaryRow label="Teslimat" value={deliveryFee ? formatMenuPrice(deliveryFee) : "Ücretsiz"} /> : null}
            {totals.couponDiscount > 0 ? <FoodSummaryRow label="Kupon indirimi" value={`-${formatMenuPrice(totals.couponDiscount)}`} /> : null}
            <FoodSummaryRow strong label="Toplam" value={formatMenuPrice(total)} />
          </View>
          <View style={{ backgroundColor: colors.backgroundAlt, borderRadius: radii.lg, gap: 3, padding: spacing.md }}>
            <Text style={{ ...typography.label, color: colors.ink }}>{form.name}</Text>
            <Text style={{ ...typography.small, color: colors.muted }}>{form.phone}</Text>
            <Text style={{ ...typography.small, color: colors.muted }}>
              {deliveryType === "delivery" ? form.address : "Mağazadan teslim"}
            </Text>
            <Text style={{ ...typography.small, color: colors.muted }}>
              Ödeme: {paymentMethod ? getPaymentMethodLabel(paymentMethod) : "-"}
            </Text>
          </View>
        </View>
      ) : null}

      {cartEnabled && step !== "success" && step !== "products" && cartRows.length > 0 ? (
        <View
          testID="food-checkout-footer"
          style={{
            backgroundColor: colors.surfaceRaised,
            borderTopColor: colors.brandSoft,
            borderTopWidth: 1,
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.md,
            paddingTop: spacing.sm
          }}
        >
          {!hasMinimumOrder ? (
            <Text style={{ ...typography.small, color: colors.coral }}>
              Minimum sipariş tutarı {formatMenuPrice(minOrderAmount)}
            </Text>
          ) : null}
          {orderError ? <Text style={{ ...typography.small, color: colors.coral }}>{orderError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={footerDisabled}
            onPress={handleFooterPress}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: footerDisabled ? colors.muted : actionColors.order.bg,
              borderRadius: radii.xl,
              flexDirection: "row",
              justifyContent: "space-between",
              minHeight: 52,
              opacity: pressed ? 0.9 : 1,
              paddingHorizontal: spacing.lg
            })}
          >
            <Text testID="food-checkout-footer-total" style={{ ...typography.button, color: actionColors.order.fg }}>
              {formatMenuPrice(total)}
            </Text>
            <Text style={{ ...typography.button, color: actionColors.order.fg }}>
              {isSubmitting
                ? "Gönderiliyor..."
                : step === "info"
                    ? "Özeti Gör"
                    : "Siparişi Onayla"}
            </Text>
          </Pressable>
        </View>
      ) : null}
      </View>
      <FoodProductDetailModal
        extraGroups={detailExtraGroups}
        isValid={detailSelectionValid}
        onAdd={addProductDetailToCart}
        onClose={() => setProductDetail(null)}
        onQuantityChange={(nextQuantity) => setProductDetail((current) => current ? { ...current, quantity: nextQuantity } : current)}
        onToggleExtra={toggleProductExtra}
        productDetail={productDetail}
        selectedExtras={detailSelectedExtras}
        total={detailTotal}
      />
    </>
  );
}

function FoodProductDetailModal({
  extraGroups,
  isValid,
  onAdd,
  onClose,
  onQuantityChange,
  onToggleExtra,
  productDetail,
  selectedExtras,
  total
}: {
  extraGroups: PublicFoodMenuExtraGroup[];
  isValid: boolean;
  onAdd: () => void;
  onClose: () => void;
  onQuantityChange: (quantity: number) => void;
  onToggleExtra: (group: PublicFoodMenuExtraGroup, extra: PublicFoodMenuExtra) => void;
  productDetail: FoodProductDetailState | null;
  selectedExtras: FoodSelectedExtra[];
  total: number;
}) {
  const actionColors = getActionColors();
  const { isDark } = useThemeMode();
  const optionalBadgeBg = isDark ? colors.accentSoft : "#E8FFF0";
  const optionalBadgeBorder = isDark ? colors.accent : "#33C36B";
  const optionalBadgeText = isDark ? colors.accentDeep : "#17904C";

  if (!productDetail) {
    return null;
  }

  const product = productDetail.product;
  const imageUri = resolveTikProfilAssetUrl(product.imageUrl || product.image);
  const basePrice = resolveActiveProductPrice(product);

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.56)",
          flex: 1,
          justifyContent: "flex-end"
        }}
      >
        <Pressable
          testID="food-product-modal-backdrop"
          accessibilityLabel="Ürün detayını kapat"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "92%",
            overflow: "hidden"
          }}
        >
          <View style={{ height: 192 }}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
            ) : (
              <View style={{ alignItems: "center", backgroundColor: colors.backgroundAlt, flex: 1, justifyContent: "center" }}>
                <Icon name="utensils" color={colors.muted} size={44} />
              </View>
            )}
            <Pressable
              accessibilityLabel="Ürün detayını kapat"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: radii.pill,
                height: 42,
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
                position: "absolute",
                right: spacing.md,
                top: spacing.md,
                width: 42,
                ...shadows.soft
              })}
            >
              <Icon name="x" color={colors.inkSoft} size={21} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 470 }}
          >
            <View style={{ gap: spacing.sm, padding: spacing.lg }}>
              <View style={{ flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
                <Text style={{ ...typography.title, color: colors.ink, flex: 1, fontSize: 20, lineHeight: 25 }}>
                  {product.name}
                </Text>
                <Text style={{ ...typography.title, color: colors.ink, fontSize: 18 }}>
                  {formatMenuPrice(basePrice)}
                </Text>
              </View>
              {product.description ? (
                <Text style={{ ...typography.body, color: colors.muted, lineHeight: 23 }}>
                  {product.description}
                </Text>
              ) : null}
              {selectedExtras.length ? (
                <Text style={{ ...typography.small, color: colors.brand }}>
                  {selectedExtras.length} seçim eklendi
                </Text>
              ) : null}
            </View>

            <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
              {extraGroups.map((group, index) => {
                const selectedIds = productDetail.selections[group.id] ?? [];
                const maxText = group.selectionType === "multiple" && group.maxSelections
                  ? `En fazla ${group.maxSelections} seçebilirsiniz`
                  : "1 seçim";

                return (
                  <View
                    key={group.id}
                    style={{
                      backgroundColor: colors.brandSoft,
                      borderColor: colors.border,
                      borderRadius: 22,
                      borderWidth: 1,
                      overflow: "hidden"
                    }}
                  >
                    <View style={{ gap: 4, padding: spacing.md }}>
                      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                        <Text style={{ ...typography.label, color: colors.ink, flex: 1, fontSize: 15 }}>
                          {index + 1}. {group.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: group.isRequired ? colors.surface : optionalBadgeBg,
                            borderColor: group.isRequired ? colors.brand : optionalBadgeBorder,
                            borderRadius: radii.sm,
                            borderWidth: 1,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 5
                          }}
                        >
                          <Text style={{ ...typography.small, color: group.isRequired ? colors.brand : optionalBadgeText }}>
                            {group.isRequired ? "Zorunlu" : "İsteğe bağlı"}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ ...typography.small, color: colors.muted }}>{maxText}</Text>
                    </View>

                    {group.extras.map((extra) => (
                      <FoodOptionRow
                        key={extra.id}
                        extra={extra}
                        isSelected={selectedIds.includes(extra.id)}
                        onPress={() => onToggleExtra(group, extra)}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              padding: spacing.md
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.backgroundAlt,
                borderRadius: radii.xl,
                flexDirection: "row",
                gap: spacing.sm,
                padding: 4
              }}
            >
              <FoodCounterButton accessibilityLabel="Adedi azalt" icon="minus" onPress={() => onQuantityChange(Math.max(1, productDetail.quantity - 1))} />
              <Text style={{ ...typography.title, color: colors.ink, minWidth: 32, textAlign: "center" }}>
                {productDetail.quantity}
              </Text>
              <FoodCounterButton accessibilityLabel="Adedi artir" icon="plus" onPress={() => onQuantityChange(productDetail.quantity + 1)} />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!isValid}
              onPress={onAdd}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: isValid ? actionColors.order.bg : colors.border,
                borderRadius: radii.xl,
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                minHeight: 54,
                opacity: pressed ? 0.9 : 1,
                paddingHorizontal: spacing.lg
              })}
            >
              <Text style={{ ...typography.button, color: isValid ? actionColors.order.fg : colors.muted }}>
                {formatMenuPrice(total)}
              </Text>
              <Text style={{ ...typography.button, color: isValid ? actionColors.order.fg : colors.muted }}>
                Sepete Ekle
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FoodOptionRow({
  extra,
  isSelected,
  onPress
}: {
  extra: PublicFoodMenuExtra;
  isSelected: boolean;
  onPress: () => void;
}) {
  const imageUri = resolveTikProfilAssetUrl(extra.imageUrl || extra.image);
  const { isDark } = useThemeMode();
  const rowBackground = isSelected ? colors.surface : (isDark ? colors.backgroundAlt : "rgba(255,255,255,0.78)");

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: rowBackground,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 58,
        opacity: pressed ? 0.9 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <View
        style={{
          alignItems: "center",
          borderColor: isSelected ? colors.brand : colors.muted,
          borderRadius: radii.pill,
          borderWidth: 2,
          height: 22,
          justifyContent: "center",
          width: 22
        }}
      >
        {isSelected ? (
          <View style={{ backgroundColor: colors.brand, borderRadius: radii.pill, height: 10, width: 10 }} />
        ) : null}
      </View>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ borderRadius: radii.md, height: 40, width: 40 }} contentFit="cover" transition={160} />
      ) : null}
      <Text style={{ ...typography.body, color: colors.inkSoft, flex: 1 }}>{extra.name}</Text>
      {extra.priceModifier > 0 ? (
        <Text style={{ ...typography.label, color: colors.brand }}>
          +{formatMenuPrice(extra.priceModifier)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FoodDeliveryModeCard({
  active,
  disabled,
  icon,
  label,
  meta,
  onPress
}: {
  active: boolean;
  disabled: boolean;
  icon: IconName;
  label: string;
  meta: string;
  onPress: () => void;
}) {
  const actionColors = getActionColors();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? actionColors.order.bg : colors.surface,
        borderColor: active ? colors.accent : colors.border,
        borderRadius: radii.xl,
        borderWidth: 1.5,
        flex: 1,
        gap: 5,
        minHeight: 68,
        opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      })}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}>
        <Icon name={icon} color={active ? actionColors.order.fg : colors.ink} size={18} strokeWidth={2.5} />
        <Text numberOfLines={1} style={{ ...typography.label, color: active ? actionColors.order.fg : colors.ink, flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} style={{ ...typography.small, color: active ? actionColors.order.fg : colors.muted }}>
        {meta}
      </Text>
    </Pressable>
  );
}

function FoodSavedAddressCard({
  address,
  isSelected,
  onPress
}: {
  address: FoodSavedAddress;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isSelected ? colors.brandSoft : colors.surface,
        borderColor: isSelected ? colors.brand : colors.border,
        borderRadius: radii.xl,
        borderWidth: 1.5,
        flexDirection: "row",
        gap: spacing.sm,
        opacity: pressed ? 0.9 : 1,
        padding: spacing.sm
      })}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: isSelected ? colors.brand : colors.backgroundAlt,
          borderRadius: radii.pill,
          height: 34,
          justifyContent: "center",
          width: 34
        }}
      >
        <Icon name="mapPin" color={isSelected ? colors.onBrand : colors.ink} size={18} strokeWidth={2.5} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...typography.label, color: colors.ink }}>{address.label}</Text>
        <Text style={{ ...typography.small, color: colors.muted, lineHeight: 17 }}>{address.value}</Text>
      </View>
      <View
        style={{
          alignItems: "center",
          borderColor: isSelected ? colors.brand : colors.border,
          borderRadius: radii.pill,
          borderWidth: 2,
          height: 22,
          justifyContent: "center",
          marginTop: 2,
          width: 22
        }}
      >
        {isSelected ? <View style={{ backgroundColor: colors.brand, borderRadius: radii.pill, height: 10, width: 10 }} /> : null}
      </View>
    </Pressable>
  );
}

function FoodOrderChoiceButton({
  active,
  icon,
  label,
  onPress
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const actionColors = getActionColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: active ? actionColors.order.bg : colors.brandSoft,
        borderRadius: radii.lg,
        flex: 1,
        flexDirection: "row",
        gap: spacing.xs,
        justifyContent: "center",
        minHeight: 44,
        opacity: pressed ? 0.9 : 1,
        paddingHorizontal: spacing.sm
      })}
    >
      <Icon name={icon} color={active ? actionColors.order.fg : colors.ink} size={16} strokeWidth={2.6} />
      <Text numberOfLines={1} style={{ ...typography.label, color: active ? actionColors.order.fg : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FoodOrderProductAction({
  canOrder,
  onAdd,
  onRemove,
  quantity,
  size = 36
}: {
  canOrder: boolean;
  onAdd: () => void;
  onRemove: () => void;
  quantity: number;
  size?: number;
}) {
  const actionColors = getActionColors();

  if (!canOrder) {
    return null;
  }

  if (quantity > 0) {
    return (
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}>
        <FoodCounterButton accessibilityLabel="Adedi azalt" icon={getFoodQuantityDecreaseIcon(quantity)} onPress={onRemove} />
        <Text style={{ ...typography.label, color: colors.ink, minWidth: 16, textAlign: "center" }}>{quantity}</Text>
        <FoodCounterButton accessibilityLabel="Adedi artir" icon="plus" onPress={onAdd} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel="Adedi artir"
      accessibilityRole="button"
      onPress={onAdd}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: actionColors.order.bg,
        borderRadius: radii.pill,
        height: size,
        justifyContent: "center",
        opacity: pressed ? 0.88 : 1,
        width: size
      })}
    >
      <Icon name="plus" color={actionColors.order.fg} size={Math.max(size - 16, 17)} strokeWidth={2.8} />
    </Pressable>
  );
}

function FeaturedFoodOrderProductCard({
  canOrder,
  onAdd,
  onRemove,
  product,
  quantity,
  showPrice
}: {
  canOrder: boolean;
  onAdd: () => void;
  onRemove: () => void;
  product: PublicFoodMenuProduct;
  quantity: number;
  showPrice: boolean;
}) {
  const actionColors = getActionColors();
  const { isDark } = useThemeMode();
  const imageUri = resolveTikProfilAssetUrl(product.imageUrl || product.image);
  const price = resolveActiveProductPrice(product);
  const descriptionColor = isDark ? "rgba(23,41,24,0.72)" : "rgba(255,255,255,0.78)";
  const imageFallbackBg = isDark ? "rgba(7,18,15,0.12)" : "rgba(255,255,255,0.18)";

  return (
    <View
      style={{
        backgroundColor: actionColors.order.bg,
        borderRadius: 24,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 128,
        overflow: "hidden",
        padding: spacing.md,
        ...shadows.soft
      }}
    >
      <Pressable
        accessibilityRole="button"
        disabled={!canOrder}
        onPress={onAdd}
        style={({ pressed }) => ({
          flex: 1,
          gap: spacing.xs,
          justifyContent: "flex-start",
          minWidth: 0,
          opacity: pressed ? 0.9 : 1,
          paddingBottom: 42,
          paddingTop: 2
        })}
      >
        <Text numberOfLines={2} style={{ ...typography.title, color: actionColors.order.fg, fontSize: 20, lineHeight: 22 }}>
          {product.name}
        </Text>
        {product.description ? (
          <Text numberOfLines={2} style={{ ...typography.small, color: descriptionColor, fontWeight: "800", lineHeight: 16 }}>
            {product.description}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!canOrder}
        onPress={onAdd}
        style={({ pressed }) => ({
          backgroundColor: imageFallbackBg,
          borderRadius: 22,
          height: 104,
          opacity: pressed ? 0.9 : 1,
          overflow: "hidden",
          width: 112
        })}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
        ) : (
          <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
            <Icon name="utensils" color={actionColors.order.fg} size={28} />
          </View>
        )}
      </Pressable>
      <View style={{ alignItems: "center", bottom: spacing.md, flexDirection: "row", gap: spacing.sm, left: spacing.md, position: "absolute" }}>
        {showPrice ? (
          <Text style={{ ...typography.title, color: actionColors.order.fg, fontSize: 20 }}>
            {formatMenuPrice(price)}
          </Text>
        ) : null}
        <FoodOrderProductAction canOrder={canOrder} onAdd={onAdd} onRemove={onRemove} quantity={quantity} size={36} />
      </View>
    </View>
  );
}

function CompactFoodOrderProductCard({
  canOrder,
  onAdd,
  onRemove,
  product,
  quantity,
  showPrice
}: {
  canOrder: boolean;
  onAdd: () => void;
  onRemove: () => void;
  product: PublicFoodMenuProduct;
  quantity: number;
  showPrice: boolean;
}) {
  const actionColors = getActionColors();
  const imageUri = resolveTikProfilAssetUrl(product.imageUrl || product.image);
  const price = resolveActiveProductPrice(product);

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        minHeight: 72,
        padding: spacing.sm
      }}
    >
      <Pressable
        accessibilityRole="button"
        disabled={!canOrder}
        onPress={onAdd}
        style={({ pressed }) => ({
          alignItems: "center",
          flex: 1,
          flexDirection: "row",
          gap: spacing.sm,
          minWidth: 0,
          opacity: pressed ? 0.9 : 1
        })}
      >
        <View
          style={{
            backgroundColor: colors.backgroundAlt,
            borderRadius: 15,
            height: 54,
            overflow: "hidden",
            width: 54
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
          ) : (
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
              <Icon name="utensils" color={colors.muted} size={20} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink, fontSize: 14 }}>
            {product.name}
          </Text>
          {showPrice ? (
            <Text style={{ ...typography.title, color: actionColors.order.bg, fontSize: 15 }}>
              {formatMenuPrice(price)}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <FoodOrderProductAction canOrder={canOrder} onAdd={onAdd} onRemove={onRemove} quantity={quantity} size={34} />
    </View>
  );
}

function FoodCounterButton({
  accessibilityLabel,
  icon,
  onPress
}: {
  accessibilityLabel: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: radii.pill,
        height: 34,
        justifyContent: "center",
        opacity: pressed ? 0.86 : 1,
        width: 34
      })}
    >
      <Icon name={icon} color={colors.ink} size={17} strokeWidth={2.6} />
    </Pressable>
  );
}

function FoodCheckoutInput({
  autoCapitalize,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  testID,
  value
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "phone-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  testID?: string;
  value: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ ...typography.small, color: colors.mutedStrong }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={colors.muted}
        testID={testID}
        style={{
          ...typography.body,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
          borderWidth: 1,
          color: colors.ink,
          minHeight: multiline ? 88 : 48,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          textAlignVertical: multiline ? "top" : "center"
        }}
        value={value}
      />
    </View>
  );
}

function FoodSummaryRow({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
      <Text style={{ ...(strong ? typography.label : typography.body), color: strong ? colors.ink : colors.muted }}>{label}</Text>
      <Text style={{ ...(strong ? typography.title : typography.label), color: colors.ink }}>{value}</Text>
    </View>
  );
}

function getActionColors() {
  return {
    order: { bg: colors.brand, fg: colors.onBrand }
  } as const;
}

function getCategoryOrder(category: { sortOrder?: number; order?: number }) {
  return category.sortOrder ?? category.order ?? 0;
}

function getProductOrder(product: PublicFoodMenuProduct) {
  return product.sortOrder ?? product.order ?? 0;
}

function formatMenuPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}
