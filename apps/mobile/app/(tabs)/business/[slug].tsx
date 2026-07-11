import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchPublicEcommerceProducts,
  fetchPublicEcommerceSettings,
  fetchDiscoveryBusinesses,
  fetchPublicFoodMenu,
  fetchPublicProfile,
  getLocalDiscoveryBootstrap,
  logQrScan,
  resolveTikProfilAssetUrl,
  submitPublicFastFoodOrder,
  validatePublicFastFoodCoupon,
  type KesfetBusiness,
  type PublicEcommerceCategory,
  type PublicEcommerceProduct,
  type PublicEcommerceSettings,
  type PublicEcommerceShippingOption,
  type PublicFoodMenuData,
  type PublicFoodMenuExtra,
  type PublicFoodMenuExtraGroup,
  type PublicFoodMenuProduct,
  type PublicFastFoodOrderResponse,
  type PublicProfile,
  type PublicProfileSocialLinks,
  submitPublicEcommerceCheckout
} from "@/api/kesfet";
import { EmptyState } from "@/components/business/empty-state";
import { CustomerApiError } from "@/api/customer";
import { useCustomerSession } from "@/auth/auth-store";
import { buildCheckoutAddresses } from "@/business/checkout-addresses";
import {
  applyCoupon,
  buildCheckoutPrefill,
  buildFastFoodOrderPayload,
  calculateCheckoutTotals,
  calculateDeliveryFee,
  createCheckoutSubmitGuard,
  getPaymentMethodLabel,
  isDeliveryModeAvailable,
  listAvailablePaymentMethods,
  reconcileCouponForDelivery,
  removeCoupon,
  resolveActiveProductPrice,
  resolveCheckoutIdempotency,
  resolveDeliveryMode,
  resolvePaymentMethod,
  validateCheckout,
  type AppliedCoupon,
  type CheckoutIdempotencyState,
  type CheckoutPrefill,
  type PaymentMethod
} from "@/checkout/checkout-state";
import { Icon, type IconName } from "@/components/common/Icon";
import { BusinessCardSkeleton } from "@/components/ui/Skeleton";
import {
  resolvePrimaryProfileAction,
  type FoodMenuKind,
  type PrimaryProfileAction
} from "@/business/profile-actions";
import { useDiscoveryStore } from "@/state/discovery-store";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact } from "@/utils/haptics";

interface DisplayProfile {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  cover: string | null;
  industry: string;
  industryLabel: string;
  isVerified: boolean;
  phone: string | null;
  whatsapp: string | null;
  about: string | null;
  address: string | null;
  mapsUrl: string | null;
  modules: string[];
  hasRestaurantModule: boolean;
  cartEnabled: boolean;
  social: PublicProfileSocialLinks;
}

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
    verified: colors.brand,
    pillBg: colors.brandSoft,
    pillText: colors.brandDeep
  } as const;
}

function getPrimaryActionSubtitle(action: PrimaryProfileAction) {
  if (action.menuKind === "fastfood") {
    return "Menüyü aç, sepete ekle";
  }

  if (action.menuKind === "restaurant") {
    return "Menü ve detayları görüntüle";
  }

  if (action.panelKind === "ecommerce") {
    return "Ürünleri incele, sipariş oluştur";
  }

  if (action.label.includes("Randevu")) {
    return "Uygun zaman için hızlı iletişim";
  }

  if (action.label.includes("Rezervasyon")) {
    return "Müsaitlik ve rezervasyon bilgisi";
  }

  if (action.label.includes("Teklif")) {
    return "Detayları ilet, teklif al";
  }

  if (action.label.includes("Ürün")) {
    return "Ürün bilgisi için hızlı iletişim";
  }

  return "Profil işlemini başlat";
}

export default function BusinessDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useThemeMode();
  const params = useLocalSearchParams<{ slug?: string }>();
  const discovery = useDiscoveryStore();
  const { accessToken, customer, refreshCustomer } = useCustomerSession();
  const actionColors = getActionColors();
  const [profile, setProfile] = React.useState<PublicProfile | null>(null);
  const [business, setBusiness] = React.useState<KesfetBusiness | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [openMenuKind, setOpenMenuKind] = React.useState<FoodMenuKind | null>(null);
  const [isEcommerceOpen, setIsEcommerceOpen] = React.useState(false);
  const [loadedMenu, setLoadedMenu] = React.useState<LoadedFoodMenu | null>(null);
  const [isMenuLoading, setIsMenuLoading] = React.useState(false);
  const [menuError, setMenuError] = React.useState<string | null>(null);
  const [selectedMenuCategoryId, setSelectedMenuCategoryId] = React.useState<string | null>(null);
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

      const profileResponse = await fetchPublicProfile(slug);

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

        logQrScan({ id: profileResponse.profile.id, slug: profileResponse.profile.slug }).catch(() => undefined);
        return;
      }

      const businessesResponse = await fetchDiscoveryBusinesses({ limit: 100 });

      if (!isMounted) {
        return;
      }

      const matchedBusiness = businessesResponse.businesses.find((item) => item.slug === slug) ?? null;
      setProfile(null);
      setBusiness(matchedBusiness);
      setIsLoading(false);

      if (matchedBusiness) {
        logQrScan(matchedBusiness).catch(() => undefined);
      }
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
    setOpenMenuKind(null);
    setIsEcommerceOpen(false);
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
    return (
      <View style={{ backgroundColor: colors.background, flex: 1, padding: spacing.screen, paddingTop: insets.top + spacing.xl }}>
        <BusinessCardSkeleton />
      </View>
    );
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
  const primaryAction = resolvePrimaryProfileAction(displayProfile);
  const socialCards = buildSocialCards(displayProfile, mapUrl);
  const coverUri = resolveTikProfilAssetUrl(displayProfile.cover);
  const logoUri = resolveTikProfilAssetUrl(displayProfile.logo);
  const currentProfile = displayProfile;
  const isOrderSurfaceOpen = Boolean(openMenuKind || isEcommerceOpen);
  const bottomNavigationHeight = 68 + Math.max(insets.bottom, 8);
  const contentBottomPadding = isOrderSurfaceOpen
    ? bottomNavigationHeight
    : spacing.tabBar + spacing.xxl;
  const activeMenuData = openMenuKind && loadedMenu?.slug === currentProfile.slug && loadedMenu.kind === openMenuKind
    ? loadedMenu.data
    : null;

  async function handlePrimaryActionPress() {
    if (primaryAction.panelKind === "ecommerce") {
      lightImpact();
      setOpenMenuKind(null);
      setIsEcommerceOpen((current) => !current);
      return;
    }

    if (primaryAction.menuKind) {
      lightImpact();
      setIsEcommerceOpen(false);

      const nextMenuKind = openMenuKind === primaryAction.menuKind ? null : primaryAction.menuKind;
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

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ backgroundColor: colors.background, paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 150 + insets.top, position: "relative" }}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={220} />
          ) : (
            <LinearGradient colors={[...colors.heroGradient]} style={{ flex: 1 }} />
          )}
          <TopIconButton
            accessibilityLabel="Geri dön"
            icon="arrowLeft"
            left={spacing.md}
            onPress={navigateBack}
            top={insets.top + spacing.xs}
          />
          {favoriteSource ? (
            <TopIconButton
              accessibilityLabel={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
              icon={isFavorite ? "heartFill" : "heart"}
              iconColor={isFavorite ? colors.coral : colors.ink}
              onPress={() => {
                lightImpact();
                discovery.toggleFavorite(favoriteSource);
              }}
              right={spacing.md}
              top={insets.top + spacing.xs}
            />
          ) : null}
        </View>

        <View style={{ gap: spacing.xl, paddingHorizontal: spacing.screen, paddingTop: 0 }}>
          <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, marginTop: -26 }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.surface,
                borderColor: colors.brandSoft,
                borderRadius: radii.pill,
                borderWidth: 5,
                height: 96,
                justifyContent: "center",
                overflow: "hidden",
                width: 96,
                ...shadows.soft
              }}
            >
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
              ) : (
                <Text style={{ ...typography.title, color: colors.ink }}>{getInitials(displayProfile.name)}</Text>
              )}
            </View>

            <View style={{ flex: 1, gap: 5, paddingTop: spacing.xxl }}>
              <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
                <Text numberOfLines={2} style={{ ...typography.title, color: colors.ink, flexShrink: 1, fontSize: 16, lineHeight: 20 }}>
                  {displayProfile.name}
                </Text>
                {displayProfile.isVerified ? <Icon name="verified" color={actionColors.verified} size={19} /> : null}
              </View>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: actionColors.pillBg,
                  borderRadius: radii.pill,
                  paddingHorizontal: 7,
                  paddingVertical: 2
                }}
              >
                <Text numberOfLines={1} style={{ ...typography.tab, color: actionColors.pillText, fontSize: 10, lineHeight: 12, textTransform: "uppercase" }}>
                  {displayProfile.industryLabel}
                </Text>
              </View>
              {displayProfile.about ? (
                <Text numberOfLines={2} style={{ ...typography.body, color: colors.inkSoft, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>
                  {trimDescription(displayProfile.about)}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <SupportProfileActionCard
                backgroundColor={actionColors.call.bg}
                foregroundColor={actionColors.call.fg}
                icon="phone"
                label="Ara"
                onPress={() => openExternal(callUrl)}
              />
              <SupportProfileActionCard
                backgroundColor={actionColors.whatsapp.bg}
                foregroundColor={actionColors.whatsapp.fg}
                icon="whatsapp"
                label="WhatsApp"
                onPress={() => openExternal(whatsappUrl)}
              />
              <SupportProfileActionCard
                backgroundColor={actionColors.location.bg}
                foregroundColor={actionColors.location.fg}
                icon="mapPin"
                label="Konum"
                onPress={() => openExternal(mapUrl)}
              />
            </View>
            <PrimaryProfileActionCard
              foregroundColor={actionColors.order.fg}
              icon={primaryAction.icon}
              isExpanded={
                primaryAction.panelKind === "ecommerce"
                  ? isEcommerceOpen
                  : openMenuKind === primaryAction.menuKind
              }
              label={primaryAction.label}
              onPress={handlePrimaryActionPress}
              showChevron={primaryAction.showChevron}
              subtitle={getPrimaryActionSubtitle(primaryAction)}
            />
          </View>

          {isEcommerceOpen ? (
            <EcommerceOrderPanel
              businessId={displayProfile.id}
              businessName={displayProfile.name}
            />
          ) : null}

          {openMenuKind ? (
            <FoodMenuPanel
              accessToken={accessToken}
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

      </ScrollView>
    </View>
  );
}

function TopIconButton({
  accessibilityLabel,
  icon,
  iconColor = colors.ink,
  left,
  onPress,
  right,
  top
}: {
  accessibilityLabel: string;
  icon: IconName;
  iconColor?: string;
  left?: number;
  onPress: () => void;
  right?: number;
  top: number;
}) {
  const { isDark } = useThemeMode();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.94)",
        borderColor: isDark ? colors.border : "transparent",
        borderRadius: radii.pill,
        borderWidth: 1,
        height: 38,
        justifyContent: "center",
        left,
        opacity: pressed ? 0.88 : 1,
        position: "absolute",
        right,
        top,
        width: 38,
        ...shadows.soft
      })}
    >
      <Icon name={icon} color={iconColor} size={19} />
    </Pressable>
  );
}

function SupportProfileActionCard({
  backgroundColor,
  foregroundColor,
  icon,
  label,
  onPress
}: {
  backgroundColor: string;
  foregroundColor: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor,
        borderColor: colors.brandSoft,
        borderRadius: 20,
        borderWidth: 2,
        flex: 1,
        gap: 6,
        height: 72,
        justifyContent: "center",
        opacity: pressed ? 0.9 : 1,
        paddingHorizontal: spacing.xs,
        ...shadows.soft
      })}
    >
      <Icon name={icon} color={foregroundColor} size={21} strokeWidth={2.5} />
      <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink, fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryProfileActionCard({
  foregroundColor,
  icon,
  isExpanded = false,
  label,
  onPress,
  showChevron = false,
  subtitle
}: {
  foregroundColor: string;
  icon: IconName;
  isExpanded?: boolean;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  subtitle: string;
}) {
  const { isDark } = useThemeMode();
  const gradientEnd = isDark ? colors.accent : "#FF4D83";
  const iconBubbleColor = isDark ? "rgba(7,18,15,0.14)" : "rgba(255,255,255,0.18)";
  const subtitleColor = isDark ? "rgba(23,41,24,0.72)" : "rgba(255,255,255,0.78)";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 24,
        opacity: pressed ? 0.9 : 1,
        overflow: "hidden",
        ...shadows.soft
      })}
    >
      <LinearGradient
        colors={[colors.brand, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          alignItems: "center",
          borderRadius: 24,
          flexDirection: "row",
          gap: spacing.md,
          minHeight: 66,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: iconBubbleColor,
            borderRadius: radii.pill,
            height: 40,
            justifyContent: "center",
            width: 40
          }}
        >
          <Icon name={icon} color={foregroundColor} size={22} strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={{ ...typography.button, color: foregroundColor, fontSize: 16 }}>
            {label}
          </Text>
          <Text numberOfLines={1} style={{ ...typography.small, color: subtitleColor, fontWeight: "800" }}>
            {subtitle}
          </Text>
        </View>
      {showChevron ? (
        <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
            <Icon name="chevronDown" color={foregroundColor} size={18} strokeWidth={2.8} />
        </View>
      ) : null}
      </LinearGradient>
    </Pressable>
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
            <Icon name="verified" color={colors.brand} size={34} />
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

          <View style={{ gap: spacing.md, padding: spacing.md, paddingTop: categories.length ? 0 : spacing.md }}>
            {activeProducts.length ? (
              activeProducts.map((product) => (
                <EcommerceProductCard
                  key={product.id}
                  onAdd={() => updateQuantity(product.id, 1)}
                  onRemove={() => updateQuantity(product.id, -1)}
                  product={product}
                  quantity={cartItems[product.id] ?? 0}
                />
              ))
            ) : (
              <Text style={{ ...typography.body, color: colors.muted }}>Bu mağazada henüz ürün yok.</Text>
            )}
          </View>
        </>
      ) : step === "info" ? (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
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
          <EcommerceInput label="Kupon kodu" autoCapitalize="characters" value={form.couponCode} onChangeText={(value) => setForm((current) => ({ ...current, couponCode: value }))} />
        </View>
      ) : (
        <View style={{ gap: spacing.md, padding: spacing.lg }}>
          {cartRows.map((item) => (
            <View key={item.product.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
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
        </View>
      )}

      {step !== "success" && cartRows.length > 0 ? (
        <View
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
        <Image source={{ uri: imageUri }} style={{ aspectRatio: 1.8, width: "100%" }} contentFit="cover" transition={180} />
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

type FoodOrderStep = "products" | "info" | "confirm" | "success";

interface FoodSelectedExtra {
  groupId: string;
  id: string;
  name: string;
  priceModifier: number;
}

interface FoodCartItem {
  key: string;
  productId: string;
  quantity: number;
  selectedExtras: FoodSelectedExtra[];
  unitPrice: number;
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

function FoodMenuPanel({
  accessToken,
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
  const [cartItems, setCartItems] = React.useState<Record<string, FoodCartItem>>({});
  const [productDetail, setProductDetail] = React.useState<FoodProductDetailState | null>(null);
  const [step, setStep] = React.useState<FoodOrderStep>("products");
  const [deliveryType, setDeliveryType] = React.useState<"pickup" | "delivery">("delivery");
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(prefill.selectedAddressId);
  const [isAddingAddress, setIsAddingAddress] = React.useState(prefill.addressMode === "new");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | null>("cash");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCouponLoading, setIsCouponLoading] = React.useState(false);
  const [appliedCoupon, setAppliedCoupon] = React.useState<AppliedCoupon | null>(null);
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
  const freeDeliveryAbove = settings?.freeDeliveryAbove ?? 0;
  const deliveryFeeSetting = settings?.deliveryFee ?? 0;

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

  const subtotal = cartRows.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = calculateDeliveryFee({
    deliveryFee: deliveryFeeSetting,
    deliveryType,
    freeDeliveryAbove,
    subtotal
  });
  const totals = calculateCheckoutTotals({ coupon: appliedCoupon, deliveryFee, subtotal });
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
  const menuMaxHeight = cartRows.length > 0
    ? Math.max(520, Math.round(screenHeight * 0.64))
    : Math.max(640, Math.round(screenHeight * 0.82));
  const orderFormMaxHeight = Math.max(430, Math.round(screenHeight * 0.62));

  React.useEffect(() => {
    activeCategoryRef.current = activeCategoryId;
  }, [activeCategoryId]);

  React.useEffect(() => {
    setAppliedCoupon(null);
    setCouponMessage(null);
  }, [couponCartKey]);

  React.useEffect(() => {
    setAppliedCoupon((current) => reconcileCouponForDelivery(current, deliveryType, deliveryFee));
    if (deliveryType === "pickup") setCouponMessage(null);
  }, [deliveryFee, deliveryType]);

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
            contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingTop: spacing.sm }}
            nestedScrollEnabled
            onScroll={handleMenuScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: cartEnabled ? menuMaxHeight : undefined }}
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
                <EcommerceInput label="Yeni adres" multiline value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} />
              ) : null}
            </View>
          ) : null}
          <EcommerceInput label="Ad Soyad" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
          <EcommerceInput label="Telefon" keyboardType="phone-pad" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <View style={{ gap: spacing.sm }}>
            <Text style={{ ...typography.small, color: colors.mutedStrong }}>Kupon</Text>
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <EcommerceInput
                  autoCapitalize="characters"
                  label="Kupon kodu"
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
          <EcommerceInput label="Sipariş notu" multiline value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} />
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
            <SummaryRow label="Ara toplam" value={formatMenuPrice(subtotal)} />
            {deliveryType === "delivery" ? <SummaryRow label="Teslimat" value={deliveryFee ? formatMenuPrice(deliveryFee) : "Ücretsiz"} /> : null}
            {totals.couponDiscount > 0 ? <SummaryRow label="Kupon indirimi" value={`-${formatMenuPrice(totals.couponDiscount)}`} /> : null}
            <SummaryRow strong label="Toplam" value={formatMenuPrice(total)} />
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

      {cartEnabled && step !== "success" && cartRows.length > 0 ? (
        <View
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
        <Pressable accessibilityRole="button" onPress={onClose} style={{ flex: 1 }} />
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
              <RoundCounterButton icon="x" onPress={() => onQuantityChange(Math.max(1, productDetail.quantity - 1))} />
              <Text style={{ ...typography.title, color: colors.ink, minWidth: 32, textAlign: "center" }}>
                {productDetail.quantity}
              </Text>
              <RoundCounterButton icon="plus" onPress={() => onQuantityChange(productDetail.quantity + 1)} />
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
        <RoundCounterButton icon="x" onPress={onRemove} />
        <Text style={{ ...typography.label, color: colors.ink, minWidth: 16, textAlign: "center" }}>{quantity}</Text>
        <RoundCounterButton icon="plus" onPress={onAdd} />
      </View>
    );
  }

  return (
    <Pressable
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
