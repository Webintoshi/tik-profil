import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { createListingInquiry, type ListingOptions } from "@/api/listings";
import { useCustomerSession } from "@/auth/auth-store";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon } from "@/components/common/Icon";
import {
  createListingInquiryIdempotencyState,
  createListingInquiryState,
  reduceListingInquiryState,
  resolveListingInquiryIdempotency
} from "@/listings/listing-state";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { lightImpact } from "@/utils/haptics";

export function ListingPanel({ businessSlug, isLoading, options }: {
  businessSlug: string;
  isLoading: boolean;
  options: ListingOptions | null;
}) {
  const { customer, refreshCustomer, runAuthenticated, signIn, status: sessionStatus } = useCustomerSession();
  const [state, dispatch] = React.useReducer(reduceListingInquiryState, undefined, createListingInquiryState);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const idempotencyRef = React.useRef(createListingInquiryIdempotencyState());
  const initializedIdentityRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const identity = customer?.profile?.appUserId ?? customer?.email ?? null;
    if (!identity || initializedIdentityRef.current === identity) return;
    initializedIdentityRef.current = identity;
    setCustomerName(customer?.profile?.displayName ?? "");
    setCustomerPhone(customer?.profile?.phone ?? "");
  }, [customer]);

  React.useEffect(() => {
    const firstListingId = options?.listings[0]?.id;
    if (firstListingId && !state.listingId) dispatch({ type: "select-listing", listingId: firstListingId });
  }, [options?.listings, state.listingId]);

  const selectedListing = options?.listings.find((listing) => listing.id === state.listingId) ?? null;
  const inputStyle = {
    ...typography.body,
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  } as const;

  async function submit() {
    if (!selectedListing || !options?.moduleId || !customerName.trim() || customerPhone.replace(/\D/g, "").length < 10 || !state.message.trim()) {
      dispatch({ type: "submit-error", message: "İlan, iletişim bilgileri ve mesaj alanını kontrol edin." });
      return;
    }
    if (sessionStatus !== "signed_in") {
      await signIn();
      return;
    }

    const signature = [businessSlug, selectedListing.id, customerName.trim(), customerPhone.trim(), state.message.trim()].join("|");
    idempotencyRef.current = resolveListingInquiryIdempotency(idempotencyRef.current, signature);
    dispatch({ type: "submit-start" });
    try {
      const inquiry = await runAuthenticated((accessToken) => createListingInquiry(accessToken, {
        businessSlug,
        customerEmail: customer?.email ?? undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        idempotencyKey: idempotencyRef.current.key,
        listingId: selectedListing.id,
        message: state.message.trim(),
        moduleId: options.moduleId!
      }));
      if (!inquiry) throw new Error("Başvuru için yeniden giriş yapın.");
      dispatch({ type: "submit-success", inquiryId: inquiry.id });
      await refreshCustomer();
      lightImpact();
    } catch (error) {
      dispatch({ type: "submit-error", message: error instanceof Error ? error.message : "Başvuru gönderilemedi." });
    }
  }

  if (isLoading) {
    return <PanelShell><ActivityIndicator color={colors.brand} /><Text style={{ ...typography.body, color: colors.muted }}>İlanlar yükleniyor...</Text></PanelShell>;
  }
  if (!options?.nativeEnabled || !options.listings.length || !options.moduleId) {
    return <PanelShell><Text style={{ ...typography.sectionTitle, color: colors.ink }}>İlanlar kullanılamıyor</Text><Text style={{ ...typography.body, color: colors.muted }}>Güncel ilanlar için işletmeyle iletişime geçin.</Text></PanelShell>;
  }
  if (state.status === "success") {
    return (
      <PanelShell>
        <View style={{ alignItems: "center", backgroundColor: colors.brandSoft, borderRadius: radii.pill, height: 54, justifyContent: "center", width: 54 }}>
          <Icon color={colors.brand} name="verified" size={28} />
        </View>
        <Text style={{ ...typography.sectionTitle, color: colors.ink }}>Başvurunuz alındı</Text>
        <Text style={{ ...typography.body, color: colors.muted }}>İşletme seçtiğiniz ilan için sizinle iletişime geçecek.</Text>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <Text style={{ ...typography.sectionTitle, color: colors.ink }}>İlanları incele</Text>
      <View style={{ gap: spacing.sm }}>
        {options.listings.map((listing) => {
          const selected = listing.id === state.listingId;
          return (
            <AnimatedPressable
              accessibilityLabel={`${listing.title}, ${formatPrice(listing.price, listing.currency)}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={listing.id}
              onPress={() => dispatch({ type: "select-listing", listingId: listing.id })}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: selected ? colors.brandSoft : colors.backgroundAlt,
                borderColor: selected ? colors.brand : colors.border,
                borderRadius: radii.lg,
                borderWidth: 1,
                flexDirection: "row",
                gap: spacing.md,
                minHeight: 88,
                padding: spacing.sm
              })}
            >
              <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.md, height: 68, justifyContent: "center", overflow: "hidden", width: 76 }}>
                {listing.imageUrl ? <Image contentFit="cover" recyclingKey={listing.id} source={{ uri: listing.imageUrl }} style={{ height: "100%", width: "100%" }} /> : <Icon color={colors.brand} name="home" size={28} />}
              </View>
              <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ ...typography.label, color: colors.ink }}>{listing.title}</Text>
                {listing.locationText ? <Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>{listing.locationText}</Text> : null}
                <Text style={{ ...typography.label, color: colors.brandDeep }}>{formatPrice(listing.price, listing.currency)}</Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      <TextInput accessibilityLabel="Ad Soyad" onChangeText={setCustomerName} placeholder="Ad Soyad" placeholderTextColor={colors.muted} style={inputStyle} value={customerName} />
      <TextInput accessibilityLabel="Telefon" keyboardType="phone-pad" onChangeText={setCustomerPhone} placeholder="Telefon" placeholderTextColor={colors.muted} style={inputStyle} value={customerPhone} />
      <TextInput accessibilityLabel="Başvuru mesajı" multiline onChangeText={(message) => dispatch({ type: "set-message", message })} placeholder="İlan hakkında öğrenmek istediklerinizi yazın" placeholderTextColor={colors.muted} style={[inputStyle, { minHeight: 88, textAlignVertical: "top" }]} value={state.message} />
      {state.error ? <Text accessibilityRole="alert" style={{ ...typography.small, color: colors.coral }}>{state.error}</Text> : null}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ busy: state.status === "submitting", disabled: state.status === "submitting" }}
        disabled={state.status === "submitting"}
        onPress={() => void submit()}
        style={{ alignItems: "center", backgroundColor: colors.brand, borderRadius: radii.xl, justifyContent: "center", minHeight: 52, paddingHorizontal: spacing.lg }}
      >
        <Text style={{ ...typography.button, color: colors.onBrand }}>{state.status === "submitting" ? "Gönderiliyor..." : "Başvuruyu gönder"}</Text>
      </AnimatedPressable>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg, ...shadows.soft }}>{children}</View>;
}

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { currency: currency || "TRY", maximumFractionDigits: 0, style: "currency" }).format(value);
}
