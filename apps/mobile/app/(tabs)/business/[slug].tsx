import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchAppointmentOptions, type AppointmentOptions } from "@/api/appointments";

import {
  fetchPublicEcommerceProducts,
  fetchPublicEcommerceSettings,
  fetchDiscoveryBusinesses,
  fetchPublicFoodMenu,
  fetchPublicProfile,
  invalidatePublicEcommerceCache,
  KesfetHttpError,
  getLocalDiscoveryBootstrap,
  resolveTikProfilAssetUrl,
  type KesfetBusiness,
  type PublicEcommerceCategory,
  type PublicEcommerceProduct,
  type PublicEcommerceSettings,
  type PublicEcommerceShippingOption,
  type PublicFoodMenuData,
  type PublicFoodMenuProduct,
  type PublicProfile,
  submitPublicEcommerceCheckout
} from "@/api/kesfet";
import { EmptyState } from "@/components/business/empty-state";
import { AppointmentPanel } from "@/components/business/AppointmentPanel";
import {
  BusinessProfileHeader,
  type BusinessProfileDisplay
} from "@/components/business/BusinessProfileHeader";
import {
  FoodMenuPanel,
  useFoodMenuController
} from "@/components/business/FoodMenuPanel";
import { getCheckoutPanelHeight, getOrderSurfaceBottomPadding } from "@/components/business/menu-layout";
import { ProfileActionBar } from "@/components/business/ProfileActionBar";
import { StickyCartBar } from "@/components/business/StickyCartBar";
import { useCustomerSession } from "@/auth/auth-store";
import { buildCheckoutAddresses } from "@/business/checkout-addresses";
import {
  buildCheckoutPrefill,
  resolveActiveProductPrice
} from "@/checkout/checkout-state";
import { Icon, type IconName } from "@/components/common/Icon";
import { BusinessProfileSkeleton } from "@/components/ui/Skeleton";
import {
  resolvePrimaryProfileAction,
  type FoodMenuKind
} from "@/business/profile-actions";
import { resolveModuleFamilyDefinition, type NativeCapability } from "@/modules/module-family-registry";
import { useDiscoveryStore } from "@/state/discovery-store";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact } from "@/utils/haptics";

type DisplayProfile = BusinessProfileDisplay;

interface LoadedFoodMenu {
  kind: FoodMenuKind;
  slug: string;
  data: PublicFoodMenuData;
}

function getActionColors() {
  return {
    call: { bg: colors.surface, fg: colors.brand },
    whatsapp: { bg: colors.surface, fg: colors.brand },
    location: { bg: colors.surface, fg: colors.brand },
    order: { bg: colors.brand, fg: colors.onBrand },
    verified: colors.blue,
    pillBg: colors.brandSoft,
    pillText: colors.brandDeep
  } as const;
}

export default function BusinessDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useThemeMode();
  const params = useLocalSearchParams<{ slug?: string }>();
  const discovery = useDiscoveryStore();
  const { accessToken, customer, refreshCustomer } = useCustomerSession();
  const [profile, setProfile] = React.useState<PublicProfile | null>(null);
  const [business, setBusiness] = React.useState<KesfetBusiness | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [openMenuKind, setOpenMenuKind] = React.useState<FoodMenuKind | null>(null);
  const [isEcommerceOpen, setIsEcommerceOpen] = React.useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = React.useState(false);
  const [appointmentOptions, setAppointmentOptions] = React.useState<AppointmentOptions | null>(null);
  const [isAppointmentOptionsLoading, setIsAppointmentOptionsLoading] = React.useState(false);
  const [loadedMenu, setLoadedMenu] = React.useState<LoadedFoodMenu | null>(null);
  const [isMenuLoading, setIsMenuLoading] = React.useState(false);
  const [menuError, setMenuError] = React.useState<string | null>(null);
  const [selectedMenuCategoryId, setSelectedMenuCategoryId] = React.useState<string | null>(null);
  const menuRequestRef = React.useRef(0);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const localBusiness = React.useMemo(() => {
    if (!slug) {
      return null;
    }

    return getLocalDiscoveryBootstrap().businesses.find((item) => item.slug === slug) ?? null;
  }, [slug]);
  const resolvedBusiness = business ?? localBusiness;

  React.useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      let profileResponse: Awaited<ReturnType<typeof fetchPublicProfile>>;
      try {
        profileResponse = await fetchPublicProfile(slug);
      } catch (error) {
        if (!isMounted) return;
        const isAuthoritativeNotFound = error instanceof KesfetHttpError
          && (error.status === 404 || error.status === 410);
        if (!isAuthoritativeNotFound) {
          setIsLoading(false);
          return;
        }

        const businessesResponse = await fetchDiscoveryBusinesses({ limit: 100 });
        if (!isMounted) return;
        const matchedBusiness = businessesResponse.businesses.find((item) => item.slug === slug) ?? null;
        setProfile(null);
        setBusiness(matchedBusiness);
        setIsLoading(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      const redirectSlug = profileResponse.redirectTarget?.replace(/^\/+/, "");
      if (redirectSlug && redirectSlug !== slug) {
        router.replace(`/business/${redirectSlug}` as never);
        return;
      }

      if (profileResponse.profile) {
        setProfile(profileResponse.profile);
        setBusiness(null);
        setIsLoading(false);

        return;
      }

      setProfile(null);
      setBusiness(null);
      setIsLoading(false);

    }

    loadProfile().catch(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router, slug]);

  React.useEffect(() => {
    menuRequestRef.current += 1;
    setOpenMenuKind(null);
    setIsEcommerceOpen(false);
    setIsAppointmentOpen(false);
    setAppointmentOptions(null);
    setLoadedMenu(null);
    setMenuError(null);
    setSelectedMenuCategoryId(null);
  }, [slug]);

  React.useEffect(() => {
    if (!loadedMenu?.data.categories.length) {
      setSelectedMenuCategoryId(null);
      return;
    }

    const currentStillExists = loadedMenu.data.categories.some((category) => category.id === selectedMenuCategoryId);
    if (!currentStillExists) {
      setSelectedMenuCategoryId(loadedMenu.data.categories[0].id);
    }
  }, [loadedMenu, selectedMenuCategoryId]);

  const displayProfile = React.useMemo(() => buildDisplayProfile(profile, resolvedBusiness, slug), [profile, resolvedBusiness, slug]);
  const appointmentCandidate = React.useMemo(() => {
    if (!displayProfile) return false;
    return [...displayProfile.modules, displayProfile.industry, displayProfile.industryLabel]
      .map(resolveModuleFamilyDefinition)
      .some((definition) => definition?.nativeCapabilities.includes("appointment-booking"));
  }, [displayProfile]);

  React.useEffect(() => {
    let active = true;
    if (!displayProfile || !appointmentCandidate) {
      setAppointmentOptions(null);
      setIsAppointmentOptionsLoading(false);
      return () => { active = false; };
    }
    setIsAppointmentOptionsLoading(true);
    void fetchAppointmentOptions(displayProfile.slug).then((result) => {
      if (active) setAppointmentOptions(result);
    }).finally(() => {
      if (active) setIsAppointmentOptionsLoading(false);
    });
    return () => { active = false; };
  }, [appointmentCandidate, displayProfile?.slug]);
  const activeMenuData = openMenuKind && loadedMenu && loadedMenu.slug === displayProfile?.slug && loadedMenu.kind === openMenuKind
    ? loadedMenu.data
    : null;
  const foodMenuController = useFoodMenuController({ data: activeMenuData, kind: openMenuKind });
  const favoriteSource = React.useMemo(() => buildFavoriteBusiness(displayProfile, resolvedBusiness), [displayProfile, resolvedBusiness]);
  const orderSavedAddresses = React.useMemo(
    () => buildCheckoutAddresses(customer),
    [customer]
  );
  const orderCheckoutPrefill = React.useMemo(
    () => buildCheckoutPrefill(customer, customer?.addresses ?? []),
    [customer]
  );
  const isFavorite = favoriteSource ? discovery.isFavorite(favoriteSource.slug) : false;

  function navigateBack() {
    lightImpact();

    try {
      if (router.canGoBack()) {
        router.back();
        return;
      }
    } catch {
      // Direct entries can lack a previous navigation state.
    }

    router.replace("/" as never);
  }

  if (isLoading && !localBusiness) {
    return <BusinessProfileSkeleton topInset={insets.top} />;
  }

  if (!displayProfile) {
    return (
      <View style={{ backgroundColor: colors.background, flex: 1, padding: spacing.screen, paddingTop: insets.top + spacing.xl }}>
        <Pressable
          accessibilityRole="button"
          onPress={navigateBack}
          style={{
            alignItems: "center",
            backgroundColor: colors.backgroundAlt,
            borderRadius: radii.pill,
            height: 44,
            justifyContent: "center",
            marginBottom: spacing.xl,
            width: 44
          }}
        >
          <Icon name="arrowLeft" color={colors.ink} size={22} />
        </Pressable>
        <EmptyState
          icon="search"
          title="İşletme bulunamadı"
          description="Bu profil kaldırılmış veya bağlantı değişmiş olabilir."
        />
      </View>
    );
  }

  const callUrl = displayProfile.phone ? `tel:${displayProfile.phone}` : null;
  const whatsappUrl = buildWhatsappUrl(displayProfile.whatsapp || displayProfile.phone);
  const mapUrl = buildMapUrl(displayProfile, resolvedBusiness);
  const readyCapabilities: NativeCapability[] = ["fastfood-order", "restaurant-menu", "ecommerce-order"];
  if (appointmentOptions?.nativeEnabled) readyCapabilities.push("appointment-booking");
  const primaryAction = resolvePrimaryProfileAction({ ...displayProfile, nativeCapabilities: readyCapabilities });
  const socialCards = buildSocialCards(displayProfile, mapUrl);
  const currentProfile = displayProfile;
  const isOrderSurfaceOpen = Boolean(openMenuKind || isEcommerceOpen || isAppointmentOpen);
  const isProfileCompact = isOrderSurfaceOpen;
  const hasStickyCart = Boolean(
    openMenuKind === "fastfood"
      && activeMenuData
      && !isMenuLoading
      && !menuError
      && activeMenuData.settings?.cartEnabled !== false
      && foodMenuController.step === "products"
      && foodMenuController.cart.itemCount > 0
  );
  const contentBottomPadding = isOrderSurfaceOpen
    ? getOrderSurfaceBottomPadding({ bottomInset: insets.bottom, hasStickyCart })
    : spacing.tabBar + spacing.xxl;

  async function handlePrimaryActionPress() {
    if (primaryAction.panelKind === "appointment") {
      lightImpact();
      setOpenMenuKind(null);
      setIsEcommerceOpen(false);
      setIsAppointmentOpen((current) => !current);
      return;
    }

    if (primaryAction.panelKind === "ecommerce") {
      lightImpact();
      setOpenMenuKind(null);
      setIsAppointmentOpen(false);
      setIsEcommerceOpen((current) => !current);
      return;
    }

    if (primaryAction.menuKind) {
      lightImpact();
      setIsEcommerceOpen(false);
      setIsAppointmentOpen(false);

      const nextMenuKind = openMenuKind === primaryAction.menuKind ? null : primaryAction.menuKind;
      const requestId = ++menuRequestRef.current;
      setOpenMenuKind(nextMenuKind);

      if (!nextMenuKind) {
        return;
      }

      const alreadyLoaded = loadedMenu?.slug === currentProfile.slug && loadedMenu.kind === nextMenuKind;
      if (alreadyLoaded) {
        return;
      }

      setIsMenuLoading(true);
      setMenuError(null);

      const response = await fetchPublicFoodMenu(currentProfile.slug, nextMenuKind);
      if (requestId !== menuRequestRef.current) return;
      if (response.success && response.data) {
        setLoadedMenu({ kind: nextMenuKind, slug: currentProfile.slug, data: response.data });
        setSelectedMenuCategoryId(response.data.categories[0]?.id ?? null);
      } else {
        setLoadedMenu(null);
        setSelectedMenuCategoryId(null);
        setMenuError(response.error || "Menü yüklenemedi");
      }

      setIsMenuLoading(false);
      return;
    }

    await openExternal(primaryAction.url);
  }

  const profileContent = (
    <>
        <BusinessProfileHeader
          compact={isProfileCompact}
          isFavorite={isFavorite}
          onBack={navigateBack}
          onToggleFavorite={favoriteSource ? () => {
            lightImpact();
            discovery.toggleFavorite(favoriteSource);
          } : undefined}
          profile={displayProfile}
          topInset={insets.top}
        />

        <View style={{ gap: spacing.xl, paddingHorizontal: spacing.screen, paddingTop: isProfileCompact ? spacing.md : spacing.xl }}>
          <ProfileActionBar
            compact={isProfileCompact}
            isExpanded={
              primaryAction.panelKind === "appointment"
                ? isAppointmentOpen
                : primaryAction.panelKind === "ecommerce"
                ? isEcommerceOpen
                : openMenuKind === primaryAction.menuKind
            }
            onCall={() => void openExternal(callUrl)}
            onLocation={() => void openExternal(mapUrl)}
            onPrimaryPress={() => void handlePrimaryActionPress()}
            onWhatsapp={() => void openExternal(whatsappUrl)}
            primaryAction={primaryAction}
          />
          {isAppointmentOpen ? (
            <AppointmentPanel
              businessSlug={displayProfile.slug}
              isLoading={isAppointmentOptionsLoading}
              options={appointmentOptions}
            />
          ) : null}
          {isEcommerceOpen ? (
            <EcommerceOrderPanel
              businessId={displayProfile.id}
              businessName={displayProfile.name}
            />
          ) : null}

          {openMenuKind ? (
            <FoodMenuPanel
              accessToken={accessToken}
              businessSlug={displayProfile.slug}
              controller={foodMenuController}
              data={activeMenuData}
              error={menuError}
              isLoading={isMenuLoading}
              kind={openMenuKind}
              onOrderSuccess={refreshCustomer}
              prefill={orderCheckoutPrefill}
              savedAddresses={orderSavedAddresses}
              selectedCategoryId={selectedMenuCategoryId}
              onSelectCategory={setSelectedMenuCategoryId}
            />
          ) : null}

          {!isOrderSurfaceOpen ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
              {socialCards.map((card) => (
                <SocialCard key={card.label} {...card} />
              ))}
            </View>
          ) : null}
        </View>

    </>
  );

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      {isOrderSurfaceOpen ? (
        <View style={{ backgroundColor: colors.background, flex: 1, paddingBottom: contentBottomPadding }} testID="business-profile-static">
          {profileContent}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ backgroundColor: colors.background, paddingBottom: contentBottomPadding }}
          showsVerticalScrollIndicator={false}
          testID="business-profile-scroll"
        >
          {profileContent}
        </ScrollView>
      )}
      {hasStickyCart ? (
        <StickyCartBar
          itemCount={foodMenuController.cart.itemCount}
          onPress={foodMenuController.openCart}
          total={foodMenuController.checkout.payableTotal}
        />
      ) : null}
    </View>
  );
}

type EcommerceStep = "products" | "info" | "confirm" | "success";

function EcommerceOrderPanel({
  businessId,
  businessName
}: {
  businessId: string;
  businessName: string;
}) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const checkoutViewportHeight = getCheckoutPanelHeight(screenHeight, insets.bottom);
  const actionColors = getActionColors();
  const [categories, setCategories] = React.useState<PublicEcommerceCategory[]>([]);
  const [products, setProducts] = React.useState<PublicEcommerceProduct[]>([]);
  const [settings, setSettings] = React.useState<PublicEcommerceSettings | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [cartItems, setCartItems] = React.useState<Record<string, number>>({});
  const [step, setStep] = React.useState<EcommerceStep>("products");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [orderNumber, setOrderNumber] = React.useState("");
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "Ordu",
    district: "",
    notes: "",
    couponCode: ""
  });

  React.useEffect(() => {
    let isMounted = true;

    async function loadStorefront() {
      setIsLoading(true);
      setError(null);

      const [productsResponse, settingsResponse] = await Promise.all([
        fetchPublicEcommerceProducts(businessId),
        fetchPublicEcommerceSettings(businessId)
      ]);

      if (!isMounted) {
        return;
      }

      setCategories(productsResponse.categories ?? []);
      setProducts((productsResponse.products ?? []).filter((product) => product.status !== "inactive"));
      setSettings(settingsResponse);
      setSelectedCategoryId(productsResponse.categories?.[0]?.id ?? null);
      setError(productsResponse.error ?? null);
      setIsLoading(false);
    }

    loadStorefront().catch(() => {
      if (isMounted) {
        setError("Ürünler yüklenemedi");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const activeProducts = React.useMemo(() => {
    const sortedProducts = [...products].sort((first, second) => {
      const orderDiff = (first.sortOrder ?? 0) - (second.sortOrder ?? 0);
      if (orderDiff) return orderDiff;
      return first.name.localeCompare(second.name, "tr");
    });

    return selectedCategoryId
      ? sortedProducts.filter((product) => product.categoryId === selectedCategoryId)
      : sortedProducts;
  }, [products, selectedCategoryId]);

  const cartRows = React.useMemo(() => {
    return products
      .map((product) => {
        const quantity = cartItems[product.id] ?? 0;
        if (!quantity) return null;

        return {
          product,
          quantity,
          total: product.price * quantity
        };
      })
      .filter((item): item is { product: PublicEcommerceProduct; quantity: number; total: number } => Boolean(item));
  }, [cartItems, products]);

  const subtotal = cartRows.reduce((sum, item) => sum + item.total, 0);
  const activeShipping = getActiveShippingOption(settings);
  const freeThreshold = settings?.freeShippingThreshold ?? activeShipping?.freeAbove ?? 500;
  const shippingCost = subtotal > 0 && subtotal < freeThreshold ? getShippingPrice(activeShipping) : 0;
  const total = subtotal + shippingCost;
  const cartCount = cartRows.reduce((sum, item) => sum + item.quantity, 0);
  const canSubmit = form.name.trim() && form.phone.trim() && form.address.trim() && form.city.trim() && cartRows.length > 0;

  function updateQuantity(productId: string, delta: number) {
    lightImpact();
    setCartItems((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + delta);
      const next = { ...current };

      if (nextQuantity === 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }

      return next;
    });
  }

  async function submitOrder() {
    if (!canSubmit || isSubmitting) {
      lightImpact();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await submitPublicEcommerceCheckout({
      businessId,
      items: cartRows.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity
      })),
      customerInfo: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district.trim() || undefined,
        notes: form.notes.trim() || undefined
      },
      paymentMethod: "cash",
      shippingCost,
      shippingMethod: activeShipping?.id,
      couponCode: form.couponCode.trim() || undefined
    });

    setIsSubmitting(false);

    if (response.success && response.orderNumber) {
      invalidatePublicEcommerceCache(businessId);
      setOrderNumber(response.orderNumber);
      setCartItems({});
      setStep("success");
      lightImpact();
      return;
    }

    setError(response.error || "Sipariş oluşturulamadı");
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 24,
        borderWidth: 1,
        height: step === "info" || step === "confirm" ? checkoutViewportHeight : undefined,
        overflow: "hidden",
        ...shadows.soft
      }}
    >
      <View
        style={{
          alignItems: "center",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          gap: spacing.md,
          padding: spacing.lg
        }}
      >
        {step !== "products" && step !== "success" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep(step === "confirm" ? "info" : "products")}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: colors.backgroundAlt,
              borderRadius: radii.pill,
              height: 38,
              justifyContent: "center",
              opacity: pressed ? 0.86 : 1,
              width: 38
            })}
          >
            <Icon name="arrowLeft" color={colors.ink} size={19} />
          </Pressable>
        ) : (
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.brandSoft,
              borderRadius: radii.pill,
              height: 38,
              justifyContent: "center",
              width: 38
            }}
          >
            <Icon name="store" color={colors.brand} size={19} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...typography.title, color: colors.ink, fontSize: 18 }}>
            {step === "products" && "Ürünler"}
            {step === "info" && "Teslimat Bilgileri"}
            {step === "confirm" && "Sipariş Özeti"}
            {step === "success" && "Sipariş Tamamlandı"}
          </Text>
          <Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>
            {businessName}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ alignItems: "center", gap: spacing.md, padding: spacing.xl }}>
          <ActivityIndicator color={colors.brand} />
          <Text style={{ ...typography.body, color: colors.muted }}>Ürünler yükleniyor...</Text>
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
            <Icon name="verified" color={colors.blue} size={34} />
          </View>
          <Text style={{ ...typography.title, color: colors.ink, textAlign: "center" }}>Siparişiniz alındı</Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>
            Sipariş numaranız: {orderNumber}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStep("products");
              setOrderNumber("");
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: colors.brand,
              borderRadius: radii.xl,
              minHeight: 50,
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
              paddingHorizontal: spacing.xl
            })}
          >
            <Text style={{ ...typography.button, color: colors.onBrand }}>Alışverişe devam et</Text>
          </Pressable>
        </View>
      ) : error && !products.length ? (
        <View style={{ gap: spacing.sm, padding: spacing.lg }}>
          <Text style={{ ...typography.title, color: colors.ink, fontSize: 17 }}>Sipariş ekranı açılamadı</Text>
          <Text style={{ ...typography.body, color: colors.muted }}>{error}</Text>
        </View>
      ) : step === "products" ? (
        <>
          {categories.length ? (
            <ScrollView horizontal contentContainerStyle={{ gap: spacing.sm, padding: spacing.md }} showsHorizontalScrollIndicator={false}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedCategoryId(null)}
                style={({ pressed }) => ({
                  alignItems: "center",
                  backgroundColor: selectedCategoryId ? colors.brandSoft : actionColors.order.bg,
                  borderRadius: radii.pill,
                  minHeight: 42,
                  opacity: pressed ? 0.9 : 1,
                  paddingHorizontal: spacing.md
                })}
              >
                <Text style={{ ...typography.label, color: selectedCategoryId ? colors.ink : actionColors.order.fg }}>Tümü</Text>
              </Pressable>
              {categories.map((category) => {
                const isActive = category.id === selectedCategoryId;
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    onPress={() => setSelectedCategoryId(category.id)}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: isActive ? actionColors.order.bg : colors.brandSoft,
                      borderRadius: radii.pill,
                      minHeight: 42,
                      opacity: pressed ? 0.9 : 1,
                      paddingHorizontal: spacing.md
                    })}
                  >
                    <Text style={{ ...typography.label, color: isActive ? actionColors.order.fg : colors.ink }}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {cartRows.length ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.brandSoft,
                borderColor: colors.border,
                borderRadius: 18,
                borderWidth: 1,
                flexDirection: "row",
                gap: spacing.md,
                justifyContent: "space-between",
                marginHorizontal: spacing.md,
                marginBottom: spacing.md,
                padding: spacing.md
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...typography.label, color: colors.ink }}>{cartCount} ürün sepette</Text>
                <Text style={{ ...typography.small, color: colors.muted }}>{formatMenuPrice(subtotal)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep("info")}
                style={({ pressed }) => ({
                  alignItems: "center",
                  backgroundColor: actionColors.order.bg,
                  borderRadius: radii.pill,
                  minHeight: 38,
                  justifyContent: "center",
                  opacity: pressed ? 0.9 : 1,
                  paddingHorizontal: spacing.lg
                })}
              >
                <Text style={{ ...typography.label, color: actionColors.order.fg }}>Sepete Git</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ height: Math.max(420, Math.round(screenHeight * 0.62)), overflow: "hidden" }}>
          <FlashList
            contentContainerStyle={{ padding: spacing.md, paddingTop: categories.length ? 0 : spacing.md }}
            data={activeProducts}
            drawDistance={200}
            getItemType={() => "ecommerce-product"}
            keyExtractor={(product) => product.id}
            renderItem={({ item: product }) => (
              <View style={{ marginBottom: spacing.md }}>
                <EcommerceProductCard
                  onAdd={() => updateQuantity(product.id, 1)}
                  onRemove={() => updateQuantity(product.id, -1)}
                  product={product}
                  quantity={cartItems[product.id] ?? 0}
                />
              </View>
            )}
            ListEmptyComponent={(
              <Text style={{ ...typography.body, color: colors.muted }}>Bu mağazada henüz ürün yok.</Text>
            )}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            testID="ecommerce-product-list"
          />
          </View>
        </>
      ) : step === "info" ? (
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, minHeight: 0 }}
          testID="ecommerce-info-scroll"
        >
          <EcommerceInput label="Ad Soyad" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
          <EcommerceInput label="Telefon" keyboardType="phone-pad" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <EcommerceInput label="E-posta" keyboardType="email-address" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} />
          <EcommerceInput label="Adres" multiline value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} />
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <EcommerceInput label="Şehir" value={form.city} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} />
            </View>
            <View style={{ flex: 1 }}>
              <EcommerceInput label="İlçe" value={form.district} onChangeText={(value) => setForm((current) => ({ ...current, district: value }))} />
            </View>
          </View>
          <EcommerceInput label="Sipariş notu" multiline value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} />
          <EcommerceInput label="Kupon kodu" autoCapitalize="characters" testID="ecommerce-coupon-input" value={form.couponCode} onChangeText={(value) => setForm((current) => ({ ...current, couponCode: value }))} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, minHeight: 0 }}
          testID="ecommerce-confirm-scroll"
        >
          {cartRows.map((item, index) => (
            <View
              key={item.product.id}
              testID={index === cartRows.length - 1 ? "ecommerce-confirm-last-row" : undefined}
              style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}
            >
              <Text style={{ ...typography.body, color: colors.ink, flex: 1 }}>
                {item.quantity} x {item.product.name}
              </Text>
              <Text style={{ ...typography.label, color: colors.ink }}>{formatMenuPrice(item.total)}</Text>
            </View>
          ))}
          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md }}>
            <SummaryRow label="Ara toplam" value={formatMenuPrice(subtotal)} />
            <SummaryRow label={activeShipping?.name || "Teslimat"} value={shippingCost ? formatMenuPrice(shippingCost) : "Ücretsiz"} />
            <SummaryRow strong label="Toplam" value={formatMenuPrice(total)} />
          </View>
          <View style={{ backgroundColor: colors.backgroundAlt, borderRadius: radii.lg, gap: 3, padding: spacing.md }}>
            <Text style={{ ...typography.label, color: colors.ink }}>{form.name}</Text>
            <Text style={{ ...typography.small, color: colors.muted }}>{form.phone}</Text>
            <Text style={{ ...typography.small, color: colors.muted }}>
              {form.address}, {form.district ? `${form.district} ` : ""}{form.city}
            </Text>
          </View>
        </ScrollView>
      )}

      {step !== "success" && cartRows.length > 0 ? (
        <View
          testID="ecommerce-checkout-footer"
          style={{
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            gap: spacing.md,
            padding: spacing.md
          }}
        >
          {error ? <Text style={{ ...typography.small, color: colors.coral }}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting || (step === "info" && !canSubmit)}
            onPress={() => {
              if (step === "products") setStep("info");
              if (step === "info") setStep("confirm");
              if (step === "confirm") submitOrder();
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: step === "info" && !canSubmit ? colors.muted : actionColors.order.bg,
              borderRadius: radii.xl,
              flexDirection: "row",
              justifyContent: "space-between",
              minHeight: 54,
              opacity: pressed ? 0.9 : 1,
              paddingHorizontal: spacing.lg
            })}
          >
            <Text style={{ ...typography.button, color: actionColors.order.fg }}>
              {step === "products" ? `${cartCount} ürün` : formatMenuPrice(total)}
            </Text>
            <Text style={{ ...typography.button, color: actionColors.order.fg }}>
              {isSubmitting
                ? "Gönderiliyor..."
                : step === "products"
                  ? `Sepete Git ${formatMenuPrice(subtotal)}`
                  : step === "info"
                    ? "Özeti Gör"
                    : "Siparişi Tamamla"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function EcommerceProductCard({
  onAdd,
  onRemove,
  product,
  quantity
}: {
  onAdd: () => void;
  onRemove: () => void;
  product: PublicEcommerceProduct;
  quantity: number;
}) {
  const actionColors = getActionColors();
  const imageUri = resolveTikProfilAssetUrl(product.images?.[0] || product.image);
  const stock = product.stock ?? product.stockQuantity;
  const isOutOfStock = product.trackStock && typeof stock === "number" && stock <= 0;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden"
      }}
    >
      {imageUri ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          recyclingKey={product.id}
          source={{ uri: imageUri }}
          style={{ aspectRatio: 1.8, width: "100%" }}
          transition={0}
        />
      ) : null}
      <View style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ ...typography.label, color: colors.ink, fontSize: 16 }}>
              {product.name}
            </Text>
            {product.description ? (
              <Text numberOfLines={2} style={{ ...typography.small, color: colors.muted, lineHeight: 17, marginTop: 3 }}>
                {product.description}
              </Text>
            ) : null}
          </View>
          <Text style={{ ...typography.title, color: actionColors.order.bg, fontSize: 17 }}>
            {formatMenuPrice(product.price)}
          </Text>
        </View>

        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ ...typography.small, color: isOutOfStock ? colors.coral : colors.muted }}>
            {isOutOfStock ? "Stokta yok" : product.categoryName || "Ürün"}
          </Text>
          {quantity > 0 ? (
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <RoundCounterButton icon="x" onPress={onRemove} />
              <Text style={{ ...typography.label, color: colors.ink, minWidth: 18, textAlign: "center" }}>{quantity}</Text>
              <RoundCounterButton icon="plus" onPress={onAdd} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={isOutOfStock}
              onPress={onAdd}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: isOutOfStock ? colors.muted : actionColors.order.bg,
                borderRadius: radii.pill,
                flexDirection: "row",
                gap: spacing.xs,
                minHeight: 36,
                opacity: pressed ? 0.9 : 1,
                paddingHorizontal: spacing.md
              })}
            >
              <Icon name="plus" color={actionColors.order.fg} size={17} strokeWidth={2.8} />
              <Text style={{ ...typography.label, color: actionColors.order.fg }}>Sepete ekle</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function RoundCounterButton({ icon, onPress }: { icon: IconName; onPress: () => void }) {
  const actionColors = getActionColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: actionColors.order.bg,
        borderRadius: radii.pill,
        height: 32,
        justifyContent: "center",
        opacity: pressed ? 0.88 : 1,
        width: 32
      })}
    >
      <Icon name={icon} color={actionColors.order.fg} size={16} strokeWidth={2.8} />
    </Pressable>
  );
}

function EcommerceInput({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ ...typography.small, color: colors.mutedStrong }}>{label}</Text>
      <TextInput
        {...props}
        placeholder={label}
        placeholderTextColor={colors.muted}
        style={[
          {
            backgroundColor: colors.backgroundAlt,
            borderColor: colors.border,
            borderRadius: radii.lg,
            borderWidth: 1,
            color: colors.ink,
            fontSize: 15,
            minHeight: props.multiline ? 86 : 48,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            textAlignVertical: props.multiline ? "top" : "center"
          },
          props.style
        ]}
      />
    </View>
  );
}

function SummaryRow({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
      <Text style={{ ...(strong ? typography.label : typography.body), color: colors.ink }}>{label}</Text>
      <Text style={{ ...(strong ? typography.label : typography.body), color: colors.ink }}>{value}</Text>
    </View>
  );
}

function getActiveShippingOption(settings: PublicEcommerceSettings | null) {
  return settings?.shippingOptions?.find((option) => option.isActive !== false) ?? settings?.shippingOptions?.[0] ?? null;
}

function getShippingPrice(option: PublicEcommerceShippingOption | null) {
  if (!option) {
    return 49.9;
  }

  return option.price ?? option.fee ?? 49.9;
}

function FoodOrderProductCard({
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
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
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
          gap: spacing.md,
          minWidth: 0,
          opacity: pressed ? 0.9 : 1
        })}
      >
        <View
          style={{
            backgroundColor: colors.backgroundAlt,
            borderRadius: 18,
            height: 82,
            overflow: "hidden",
            width: 82
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
          ) : (
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
              <Icon name="utensils" color={colors.muted} size={24} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink, fontSize: 15 }}>
            {product.name}
          </Text>
          {product.description ? (
            <Text numberOfLines={2} style={{ ...typography.small, color: colors.muted, lineHeight: 17 }}>
              {product.description}
            </Text>
          ) : null}
          {showPrice ? (
            <Text style={{ ...typography.title, color: actionColors.order.bg, fontSize: 17 }}>
              {formatMenuPrice(price)}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {canOrder ? (
        quantity > 0 ? (
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <RoundCounterButton icon="x" onPress={onRemove} />
            <Text style={{ ...typography.label, color: colors.ink, minWidth: 18, textAlign: "center" }}>{quantity}</Text>
            <RoundCounterButton icon="plus" onPress={onAdd} />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onAdd}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: actionColors.order.bg,
              borderRadius: radii.pill,
              height: 34,
              justifyContent: "center",
              opacity: pressed ? 0.88 : 1,
              width: 34
            })}
          >
            <Icon name="plus" color={actionColors.order.fg} size={18} strokeWidth={2.8} />
          </Pressable>
        )
      ) : null}
    </View>
  );
}

function LegacyFoodMenuPanel({
  data,
  error,
  isLoading,
  onSelectCategory,
  selectedCategoryId
}: {
  data: PublicFoodMenuData | null;
  error: string | null;
  isLoading: boolean;
  onSelectCategory: (categoryId: string) => void;
  selectedCategoryId: string | null;
}) {
  const actionColors = getActionColors();
  const categories = React.useMemo(
    () => [...(data?.categories ?? [])].sort((first, second) => getCategoryOrder(first) - getCategoryOrder(second)),
    [data?.categories]
  );
  const activeCategoryId = selectedCategoryId || categories[0]?.id || null;
  const products = React.useMemo(() => {
    const allProducts = [...(data?.products ?? [])]
      .filter((product) => product.inStock !== false)
      .sort((first, second) => getProductOrder(first) - getProductOrder(second));

    return activeCategoryId
      ? allProducts.filter((product) => product.categoryId === activeCategoryId)
      : allProducts;
  }, [activeCategoryId, data?.products]);
  const [cartItems, setCartItems] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    setCartItems({});
  }, [data?.businessId]);

  const cartSummary = React.useMemo(() => {
    if (!data) {
      return { count: 0, total: 0 };
    }

    return data.products.reduce(
      (summary, product) => {
        const quantity = cartItems[product.id] ?? 0;
        if (!quantity) {
          return summary;
        }

        return {
          count: summary.count + quantity,
          total: summary.total + resolveActiveProductPrice(product) * quantity
        };
      },
      { count: 0, total: 0 }
    );
  }, [cartItems, data]);

  function addProductToCart(productId: string) {
    lightImpact();
    setCartItems((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1
    }));
  }

  async function submitCartToWhatsapp() {
    if (!data || !cartSummary.count) {
      lightImpact();
      return;
    }

    const whatsappNumber = data.whatsapp || data.businessWhatsapp || data.businessPhone;
    await openExternal(buildWhatsappUrl(whatsappNumber, buildCartMessage(data, cartItems)));
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 24,
        borderWidth: 1,
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
      ) : error ? (
        <View style={{ gap: spacing.sm, padding: spacing.lg }}>
          <Text style={{ ...typography.title, color: colors.ink, fontSize: 17 }}>Menü açılamadı</Text>
          <Text style={{ ...typography.body, color: colors.muted }}>{error}</Text>
        </View>
      ) : data ? (
        <>
          <ScrollView
            horizontal
            contentContainerStyle={{ gap: spacing.sm, padding: spacing.md }}
            showsHorizontalScrollIndicator={false}
          >
            {categories.map((category) => {
              const isActive = category.id === activeCategoryId;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => {
                    lightImpact();
                    onSelectCategory(category.id);
                  }}
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
                  {category.icon ? (
                    <Text style={{ fontSize: 15 }}>{category.icon}</Text>
                  ) : null}
                  <Text style={{ ...typography.label, color: isActive ? actionColors.order.fg : colors.ink }}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {data.settings?.freeDeliveryAbove === 0 ? (
            <View
              style={{
                alignItems: "center",
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                paddingVertical: spacing.sm
              }}
            >
              <Text style={{ ...typography.tab, color: colors.success }}>✓ Ücretsiz Teslimat</Text>
            </View>
          ) : null}

          <View style={{ gap: spacing.md, padding: spacing.md, paddingTop: spacing.lg }}>
            {products.length ? (
              products.map((product) => (
                <FoodMenuProductCard
                  key={product.id}
                  onAdd={() => addProductToCart(product.id)}
                  product={product}
                  quantity={cartItems[product.id] ?? 0}
                />
              ))
            ) : (
              <Text style={{ ...typography.body, color: colors.muted }}>Bu kategoride ürün yok.</Text>
            )}
          </View>

          {cartSummary.count > 0 ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                padding: spacing.md
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={submitCartToWhatsapp}
                style={({ pressed }) => ({
                  alignItems: "center",
                  backgroundColor: actionColors.order.bg,
                  borderRadius: radii.xl,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  minHeight: 54,
                  opacity: pressed ? 0.9 : 1,
                  paddingHorizontal: spacing.lg
                })}
              >
                <Text style={{ ...typography.button, color: actionColors.order.fg }}>
                  {cartSummary.count} ürün
                </Text>
                <Text style={{ ...typography.button, color: actionColors.order.fg }}>
                  WhatsApp ile Sipariş {formatMenuPrice(cartSummary.total)}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function FoodMenuProductCard({
  onAdd,
  product,
  quantity
}: {
  onAdd: () => void;
  product: PublicFoodMenuProduct;
  quantity: number;
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
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        padding: spacing.sm
      }}
    >
      <View
        style={{
          backgroundColor: colors.backgroundAlt,
          borderRadius: 18,
          height: 82,
          overflow: "hidden",
          width: 82
        }}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
        ) : (
          <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
            <Icon name="utensils" color={colors.muted} size={24} />
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink, fontSize: 15 }}>
          {product.name}
        </Text>
        {product.description ? (
            <Text numberOfLines={2} style={{ ...typography.small, color: colors.muted, lineHeight: 17 }}>
              {product.description}
            </Text>
        ) : null}
        <Text style={{ ...typography.title, color: actionColors.order.bg, fontSize: 17 }}>
          {formatMenuPrice(price)}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: actionColors.order.bg,
          borderRadius: radii.pill,
          height: 34,
          justifyContent: "center",
          opacity: pressed ? 0.88 : 1,
          width: 34
        })}
      >
        {quantity > 0 ? (
          <Text style={{ ...typography.label, color: actionColors.order.fg }}>{quantity}</Text>
        ) : (
          <Icon name="plus" color={actionColors.order.fg} size={18} strokeWidth={2.8} />
        )}
      </Pressable>
    </View>
  );
}

function getCategoryOrder(category: { sortOrder?: number; order?: number }) {
  return category.sortOrder ?? category.order ?? 0;
}

function getProductOrder(product: PublicFoodMenuProduct) {
  return product.sortOrder ?? product.order ?? 0;
}

function formatMenuPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    style: "currency"
  }).format(value);
}

function buildCartMessage(data: PublicFoodMenuData, cartItems: Record<string, number>) {
  const lines = data.products
    .map((product) => {
      const quantity = cartItems[product.id] ?? 0;
      if (!quantity) {
        return null;
      }

      const unitPrice = resolveActiveProductPrice(product);
      return `- ${quantity} x ${product.name} (${formatMenuPrice(unitPrice * quantity)})`;
    })
    .filter(Boolean);
  const total = data.products.reduce((sum, product) => {
    const quantity = cartItems[product.id] ?? 0;
    return sum + resolveActiveProductPrice(product) * quantity;
  }, 0);

  return [
    `Merhaba, ${data.businessName} için sipariş vermek istiyorum.`,
    "",
    ...lines,
    "",
    `Toplam: ${formatMenuPrice(total)}`
  ].join("\n");
}

function SocialCard({
  icon,
  iconBackground,
  iconColor,
  label,
  url
}: {
  icon: IconName;
  iconBackground: string;
  iconColor?: string;
  label: string;
  url: string | null;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!url}
      onPress={() => openExternal(url)}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 24,
        borderWidth: 1,
        flexBasis: "47%",
        flexGrow: 1,
        gap: spacing.md,
        height: 128,
        justifyContent: "center",
        opacity: !url ? 0.82 : pressed ? 0.9 : 1,
        ...shadows.soft
      })}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: iconBackground,
          borderRadius: radii.pill,
          height: 48,
          justifyContent: "center",
          width: 48
        }}
      >
        <Icon name={icon} color={iconColor || colors.ink} size={22} />
      </View>
      <Text numberOfLines={1} style={{ ...typography.label, color: colors.inkSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}

function buildDisplayProfile(
  profile: PublicProfile | null,
  business: KesfetBusiness | null,
  slug?: string
): DisplayProfile | null {
  if (!profile && !business) {
    return null;
  }

  const industry = profile?.industry || business?.category || "default";
  const industryLabel = profile?.industryLabel || business?.categoryLabel || business?.category || "İşletme";

  return {
    id: profile?.id || business?.id || slug || "business",
    slug: profile?.slug || business?.slug || slug || "business",
    name: profile?.name || business?.name || "İşletme",
    logo: profile?.logo || business?.logoUrl || null,
    cover: profile?.cover || business?.coverImage || business?.logoUrl || null,
    industry,
    industryLabel,
    isVerified: profile?.isVerified ?? true,
    phone: sanitizeOptional(profile?.phone),
    whatsapp: sanitizeOptional(profile?.whatsapp),
    about: sanitizeOptional(profile?.about),
    address: sanitizeOptional(profile?.address) || [business?.district, business?.city].filter(Boolean).join(", ") || null,
    mapsUrl: sanitizeOptional(profile?.mapsUrl),
    modules: profile?.modules?.length ? profile.modules : [industry].filter(Boolean),
    hasRestaurantModule: profile?.hasRestaurantModule ?? false,
    cartEnabled: profile?.cartEnabled ?? false,
    social: profile?.social || {}
  };
}

function buildFavoriteBusiness(displayProfile: DisplayProfile | null, business: KesfetBusiness | null): KesfetBusiness | null {
  if (!displayProfile) {
    return null;
  }

  if (business) {
    return business;
  }

  return {
    id: displayProfile.id,
    slug: displayProfile.slug,
    name: displayProfile.name,
    coverImage: displayProfile.cover,
    logoUrl: displayProfile.logo,
    category: displayProfile.industry,
    categoryLabel: displayProfile.industryLabel,
    industryId: null,
    district: null,
    city: null,
    lat: null,
    lng: null,
    rating: null,
    reviewCount: null,
    createdAt: null,
    distance: null
  };
}

function buildSocialCards(profile: DisplayProfile, mapUrl: string | null) {
  const websiteUrl = toWebsiteUrl(profile.social.website);
  const instagramUrl = toInstagramUrl(profile.social.instagram);
  const googleUrl = toWebsiteUrl(profile.social.google) || mapUrl;
  const cards: Array<{
    icon: IconName;
    iconBackground: string;
    iconColor?: string;
    label: string;
    url: string | null;
  }> = [];

  if (websiteUrl) {
    cards.push({
      icon: "store",
      iconBackground: colors.brandSoft,
      iconColor: colors.brand,
      label: "Web Sitesi",
      url: websiteUrl
    });
  }

  cards.push(
    {
      icon: "instagram",
      iconBackground: colors.coralSoft,
      iconColor: colors.coral,
      label: "Instagram",
      url: instagramUrl
    },
    {
      icon: "google",
      iconBackground: colors.backgroundAlt,
      label: "Yorumlar",
      url: googleUrl
    }
  );

  return cards.slice(0, 4);
}

function buildWhatsappUrl(value?: string | null, text?: string) {
  const number = normalizePhoneForWhatsapp(value);
  if (!number) {
    return null;
  }

  const url = new URL(`https://wa.me/${number}`);
  if (text) {
    url.searchParams.set("text", text);
  }
  return url.toString();
}

function buildCallUrl(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? `tel:${digits}` : null;
}

function normalizePhoneForWhatsapp(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) {
    return null;
  }

  if (digits.startsWith("90")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `9${digits}`;
  }

  if (digits.length === 10) {
    return `90${digits}`;
  }

  return digits;
}

function buildMapUrl(profile: DisplayProfile, business: KesfetBusiness | null) {
  if (profile.mapsUrl) {
    return profile.mapsUrl;
  }

  if (business?.lat && business.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`;
  }

  if (profile.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`;
  }

  return null;
}

function toInstagramUrl(value?: string | null) {
  const cleanValue = sanitizeOptional(value);
  if (!cleanValue) {
    return null;
  }

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  return `https://instagram.com/${cleanValue.replace(/^@/, "")}`;
}

function toWebsiteUrl(value?: string | null) {
  const cleanValue = sanitizeOptional(value);
  if (!cleanValue) {
    return null;
  }

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

async function openExternal(url?: string | null) {
  if (!url) {
    lightImpact();
    return;
  }

  lightImpact();
  await Linking.openURL(url);
}

function sanitizeOptional(value?: string | null) {
  if (!value || value === "$undefined") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function trimDescription(value: string) {
  return value.length > 155 ? `${value.slice(0, 155)}...` : value;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
