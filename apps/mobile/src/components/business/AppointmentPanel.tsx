import * as React from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import {
  createAppointment,
  type AppointmentOptions
} from "@/api/appointments";
import { useCustomerSession } from "@/auth/auth-store";
import {
  createAppointmentIdempotencyState,
  createAppointmentState,
  reduceAppointmentState,
  resolveAppointmentIdempotency
} from "@/appointments/appointment-state";
import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { lightImpact } from "@/utils/haptics";

export function AppointmentPanel({ businessSlug, isLoading, options }: {
  businessSlug: string;
  isLoading: boolean;
  options: AppointmentOptions | null;
}) {
  const { customer, refreshCustomer, runAuthenticated, signIn, status: sessionStatus } = useCustomerSession();
  const [state, dispatch] = React.useReducer(reduceAppointmentState, undefined, createAppointmentState);
  const idempotencyRef = React.useRef(createAppointmentIdempotencyState());
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    const profile = customer?.profile;
    setCustomerName(profile?.displayName ?? "");
    setCustomerPhone(profile?.phone ?? "");
    setCustomerEmail(customer?.email ?? "");
  }, [customer]);

  if (isLoading) {
    return (
      <PanelShell>
        <View accessibilityLabel="Randevu seçenekleri yükleniyor" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}>
          <ActivityIndicator color={colors.brand} />
          <Text style={{ ...typography.body, color: colors.muted }}>Uygun saatler yükleniyor</Text>
        </View>
      </PanelShell>
    );
  }

  if (!options?.nativeEnabled) {
    return (
      <PanelShell>
        <View testID="appointment-panel-empty" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg }}>
          <Icon color={colors.brand} name="clock" size={28} />
          <Text style={{ ...typography.cardTitle, color: colors.ink, textAlign: "center" }}>Online randevu henüz açık değil</Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>İletişim seçeneklerini kullanarak işletmeye ulaşabilirsiniz.</Text>
        </View>
      </PanelShell>
    );
  }

  if (state.status === "success") {
    return (
      <PanelShell>
        <View testID="appointment-panel-success" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}>
          <Icon color={colors.success} name="verified" size={32} />
          <Text style={{ ...typography.sectionTitle, color: colors.ink, textAlign: "center" }}>Randevu talebiniz alındı</Text>
          <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>Durumunu Hesabım bölümünden takip edebilirsiniz.</Text>
        </View>
      </PanelShell>
    );
  }

  const selectedService = options.services.find((item) => item.id === state.serviceId);
  const selectedStaff = options.staff.find((item) => item.id === state.staffId);
  const slots = options.slots.filter((item) => (
    item.serviceId === state.serviceId && item.staffId === state.staffId
  )).slice(0, 24);
  const canSubmit = Boolean(
    selectedService && selectedStaff && state.date && state.time
      && customerName.trim().length >= 2 && customerPhone.trim().length >= 7
      && (!options.settings?.requireEmail || customerEmail.includes("@"))
  );

  async function submit() {
    if (!canSubmit || state.status === "submitting") return;
    if (sessionStatus !== "signed_in") {
      await signIn();
      return;
    }
    dispatch({ type: "submit-start" });
    try {
      const draftSignature = [
        businessSlug, selectedService!.id, selectedStaff!.id, state.date, state.time,
        customerName.trim(), customerPhone.trim(), customerEmail.trim(), note.trim()
      ].join("|");
      idempotencyRef.current = resolveAppointmentIdempotency(idempotencyRef.current, draftSignature);
      const result = await runAuthenticated((accessToken) => createAppointment(accessToken, {
        businessSlug,
        customerEmail: customerEmail.trim() || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        date: state.date!,
        idempotencyKey: idempotencyRef.current.key,
        note: note.trim() || null,
        serviceId: selectedService!.id,
        staffId: selectedStaff!.id,
        time: state.time!
      }));
      if (!result) throw new Error("Randevu için yeniden giriş yapın.");
      dispatch({ type: "submit-success", appointmentId: result.id });
      idempotencyRef.current = createAppointmentIdempotencyState();
      await refreshCustomer();
      lightImpact();
    } catch (error) {
      dispatch({ type: "submit-error", message: error instanceof Error ? error.message : "Randevu oluşturulamadı." });
    }
  }

  return (
    <PanelShell>
      <Text style={{ ...typography.sectionTitle, color: colors.ink }}>Randevu oluştur</Text>
      <ChoiceSection label="Hizmet">
        {options.services.map((service) => (
          <Choice key={service.id} active={service.id === state.serviceId} label={`${service.name} · ₺${service.price}`} onPress={() => dispatch({ type: "select-service", serviceId: service.id })} />
        ))}
      </ChoiceSection>
      <ChoiceSection label="Uzman">
        {options.staff.map((staff) => (
          <Choice key={staff.id} active={staff.id === state.staffId} label={staff.title ? `${staff.name} · ${staff.title}` : staff.name} onPress={() => dispatch({ type: "select-staff", staffId: staff.id })} />
        ))}
      </ChoiceSection>
      <ChoiceSection label="Uygun saat">
        {slots.length ? slots.map((slot) => (
          <Choice key={`${slot.date}-${slot.time}-${slot.staffId}`} active={slot.date === state.date && slot.time === state.time} label={`${formatDate(slot.date)} · ${slot.time}`} onPress={() => dispatch({ type: "select-slot", date: slot.date, time: slot.time })} />
        )) : <Text style={{ ...typography.body, color: colors.muted }}>Seçilen uzman için uygun saat bulunamadı.</Text>}
      </ChoiceSection>
      <AppointmentInput label="Ad soyad" onChangeText={setCustomerName} value={customerName} />
      <AppointmentInput keyboardType="phone-pad" label="Telefon" onChangeText={setCustomerPhone} value={customerPhone} />
      {options.settings?.requireEmail ? <AppointmentInput keyboardType="email-address" label="E-posta" onChangeText={setCustomerEmail} value={customerEmail} /> : null}
      <AppointmentInput label="Not (isteğe bağlı)" multiline onChangeText={setNote} value={note} />
      {state.status === "error" ? <Text accessibilityRole="alert" style={{ ...typography.body, color: colors.danger }}>{state.message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit || state.status === "submitting" }}
        disabled={!canSubmit || state.status === "submitting"}
        onPress={() => void submit()}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: canSubmit ? colors.brand : colors.disabled,
          borderRadius: radii.lg,
          minHeight: 52,
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1
        })}
      >
        {state.status === "submitting" ? <ActivityIndicator color={colors.onBrand} /> : (
          <Text style={{ ...typography.button, color: canSubmit ? colors.onBrand : colors.muted }}>
            {sessionStatus === "signed_in" ? "Randevu talebi gönder" : "Giriş yap ve devam et"}
          </Text>
        )}
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
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ backgroundColor: active ? colors.brandSoft : colors.backgroundAlt, borderColor: active ? colors.brand : colors.border, borderRadius: radii.pill, borderWidth: 1, minHeight: 42, justifyContent: "center", paddingHorizontal: spacing.md }}><Text style={{ ...typography.label, color: active ? colors.brandDeep : colors.ink }}>{label}</Text></Pressable>;
}

function AppointmentInput({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={{ gap: spacing.xs }}><Text style={{ ...typography.small, color: colors.muted }}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={{ ...typography.body, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.ink, minHeight: props.multiline ? 76 : 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }} {...props} /></View>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00+03:00`));
}
