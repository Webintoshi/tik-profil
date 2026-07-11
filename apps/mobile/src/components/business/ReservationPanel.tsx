import * as React from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import {
  createReservation,
  fetchReservationAvailability,
  type ReservationOptions
} from "@/api/reservations";
import { useCustomerSession } from "@/auth/auth-store";
import {
  buildReservationRange,
  createReservationIdempotencyState,
  createReservationState,
  getReservationPartySize,
  reduceReservationState,
  resolveReservationIdempotency
} from "@/reservations/reservation-state";
import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { lightImpact } from "@/utils/haptics";

export function ReservationPanel({ businessSlug, isLoading, options }: {
  businessSlug: string;
  isLoading: boolean;
  options: ReservationOptions | null;
}) {
  const { customer, refreshCustomer, runAuthenticated, signIn, status: sessionStatus } = useCustomerSession();
  const [state, dispatch] = React.useReducer(reduceReservationState, undefined, createReservationState);
  const idempotencyRef = React.useRef(createReservationIdempotencyState());
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [partySize, setPartySize] = React.useState("2");

  React.useEffect(() => {
    setCustomerName(customer?.profile?.displayName ?? "");
    setCustomerPhone(customer?.profile?.phone ?? "");
    setCustomerEmail(customer?.email ?? "");
  }, [customer]);

  if (isLoading) {
    return <PanelShell><View accessibilityLabel="Rezervasyon seçenekleri yükleniyor" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}><ActivityIndicator color={colors.brand} /><Text style={{ ...typography.body, color: colors.muted }}>Seçenekler yükleniyor</Text></View></PanelShell>;
  }

  if (!options?.nativeEnabled || !options.vertical || !options.business) {
    return (
      <PanelShell>
        <View testID="reservation-panel-empty" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg }}>
          <Icon color={colors.brand} name="clock" size={28} />
          <Text style={{ ...typography.cardTitle, color: colors.ink, textAlign: "center" }}>Online rezervasyon henüz açık değil</Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>İletişim seçeneklerini kullanarak işletmeye ulaşabilirsiniz.</Text>
        </View>
      </PanelShell>
    );
  }

  if (state.status === "success") {
    return (
      <PanelShell>
        <View testID="reservation-panel-success" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}>
          <Icon color={colors.success} name="verified" size={32} />
          <Text style={{ ...typography.sectionTitle, color: colors.ink, textAlign: "center" }}>Rezervasyon talebiniz alındı</Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>Durumu Hesabım bölümünden takip edebilirsiniz.</Text>
        </View>
      </PanelShell>
    );
  }

  const vertical = options.vertical;
  const selectedResource = options.resources.find((resource) => resource.id === state.resourceId) ?? null;
  const endDate = vertical === "restaurant" ? state.startDate : state.endDate;
  const requestRange = buildReservationRange(vertical, state.startDate, endDate, state.time);
  const requestStartDate = requestRange?.startDate ?? null;
  const requestEndDate = requestRange?.endDate ?? null;
  const parsedPartySize = getReservationPartySize(vertical, partySize);
  const canSubmit = Boolean(
    selectedResource && state.startDate && endDate
      && (vertical !== "restaurant" || state.time)
      && customerName.trim().length >= 2 && customerPhone.trim().length >= 7
      && parsedPartySize !== null
      && (vertical === "vehicle" || !selectedResource.capacity || (parsedPartySize ?? 1) <= selectedResource.capacity)
  );

  async function submit() {
    if (!canSubmit || state.status === "submitting" || !selectedResource || !requestStartDate || !requestEndDate) return;
    if (sessionStatus !== "signed_in") {
      await signIn();
      return;
    }
    dispatch({ type: "submit-start" });
    try {
      const availability = await fetchReservationAvailability({
        businessSlug,
        endDate: requestEndDate,
        resourceId: selectedResource.id,
        startDate: requestStartDate,
        vertical
      });
      if (!availability.available) throw new Error("Seçtiğiniz tarih artık müsait değil.");
      const fingerprint = [businessSlug, vertical, selectedResource.id, requestStartDate, requestEndDate, parsedPartySize ?? "", customerName.trim(), customerPhone.trim(), customerEmail.trim(), note.trim()].join("|");
      idempotencyRef.current = resolveReservationIdempotency(idempotencyRef.current, fingerprint);
      const result = await runAuthenticated((accessToken) => createReservation(accessToken, {
        businessSlug,
        customerEmail: customerEmail.trim() || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        endDate: requestEndDate,
        idempotencyKey: idempotencyRef.current.key,
        note: note.trim() || undefined,
        partySize: parsedPartySize ?? undefined,
        resourceId: selectedResource.id,
        startDate: requestStartDate,
        time: state.time ?? undefined,
        vertical
      }));
      if (!result) throw new Error("Rezervasyon için yeniden giriş yapın.");
      dispatch({ type: "submit-success", reservationId: result.id });
      idempotencyRef.current = createReservationIdempotencyState();
      await refreshCustomer();
      lightImpact();
    } catch (error) {
      dispatch({ type: "submit-error", message: error instanceof Error ? error.message : "Rezervasyon oluşturulamadı." });
    }
  }

  return (
    <PanelShell>
      <Text style={{ ...typography.sectionTitle, color: colors.ink }}>{vertical === "restaurant" ? "Masa ayırt" : vertical === "hotel" ? "Oda ayırt" : "Araç ayırt"}</Text>
      <ChoiceSection label={vertical === "restaurant" ? "Alan" : vertical === "hotel" ? "Oda" : "Araç"}>
        {options.resources.map((resource) => (
          <Choice key={resource.id} active={resource.id === state.resourceId} label={`${resource.name}${resource.unitPrice > 0 ? ` · ₺${resource.unitPrice}` : ""}`} onPress={() => dispatch({ type: "select-resource", resourceId: resource.id })} />
        ))}
      </ChoiceSection>
      <ReservationInput label={vertical === "restaurant" ? "Tarih (YYYY-AA-GG)" : "Başlangıç (YYYY-AA-GG)"} onChangeText={(date) => dispatch({ type: "select-start", date: date.trim() })} value={state.startDate ?? ""} />
      {vertical === "restaurant" ? (
        <ChoiceSection label="Saat">
          {options.timeSlots.map((time) => <Choice key={time} active={time === state.time} label={time} onPress={() => dispatch({ type: "select-time", time })} />)}
        </ChoiceSection>
      ) : <ReservationInput label="Bitiş (YYYY-AA-GG)" onChangeText={(date) => dispatch({ type: "select-end", date: date.trim() })} value={state.endDate ?? ""} />}
      {vertical !== "vehicle" ? <ReservationInput keyboardType="number-pad" label="Kişi sayısı" onChangeText={setPartySize} value={partySize} /> : null}
      <ReservationInput label="Ad soyad" onChangeText={setCustomerName} value={customerName} />
      <ReservationInput keyboardType="phone-pad" label="Telefon" onChangeText={setCustomerPhone} value={customerPhone} />
      <ReservationInput keyboardType="email-address" label="E-posta (isteğe bağlı)" onChangeText={setCustomerEmail} value={customerEmail} />
      <ReservationInput label="Not (isteğe bağlı)" multiline onChangeText={setNote} value={note} />
      {state.status === "error" ? <Text accessibilityRole="alert" style={{ ...typography.body, color: colors.danger }}>{state.message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit || state.status === "submitting" }}
        disabled={!canSubmit || state.status === "submitting"}
        onPress={() => void submit()}
        style={({ pressed }) => ({ alignItems: "center", backgroundColor: canSubmit ? colors.brand : colors.disabled, borderRadius: radii.lg, justifyContent: "center", minHeight: 52, opacity: pressed ? 0.9 : 1 })}
      >
        {state.status === "submitting" ? <ActivityIndicator color={colors.onBrand} /> : <Text style={{ ...typography.button, color: canSubmit ? colors.onBrand : colors.muted }}>{sessionStatus === "signed_in" ? "Rezervasyon talebi gönder" : "Giriş yap ve devam et"}</Text>}
      </Pressable>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: colors.surface, borderColor: colors.brandSoft, borderRadius: radii.xl, borderWidth: 1, gap: spacing.lg, padding: spacing.lg, ...shadows.soft }}>{children}</View>;
}

function ChoiceSection({ children, label }: { children: React.ReactNode; label: string }) {
  return <View style={{ gap: spacing.sm }}><Text style={{ ...typography.label, color: colors.ink }}>{label}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{children}</View></View>;
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ backgroundColor: active ? colors.brandSoft : colors.backgroundAlt, borderColor: active ? colors.brand : colors.border, borderRadius: radii.pill, borderWidth: 1, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }}><Text style={{ ...typography.label, color: active ? colors.brandDeep : colors.ink }}>{label}</Text></Pressable>;
}

function ReservationInput({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={{ gap: spacing.xs }}><Text style={{ ...typography.small, color: colors.muted }}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={{ ...typography.body, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.ink, minHeight: props.multiline ? 76 : 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }} {...props} /></View>;
}
