import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type CustomerAddress,
  type CustomerAddressInput,
  type CustomerProfileUpdate
} from "@/api/customer";
import { useCustomerSession } from "@/auth/auth-store";
import { AuthEntryCard } from "@/components/account/AuthEntryCard";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { selectionImpact } from "@/utils/haptics";

const links = [
  { label: "Yardım merkezi", icon: "compass" as const },
  { label: "Gizlilik politikası", icon: "spark" as const },
  { label: "Kullanım şartları", icon: "menu" as const }
];

const emptyProfile: CustomerProfileUpdate = {
  birthDate: null,
  displayName: null,
  hobbies: [],
  maritalStatus: null,
  occupation: null,
  phone: null
};

const emptyAddress: CustomerAddressInput = {
  city: "",
  district: "",
  fullAddress: "",
  isDefault: false,
  label: ""
};

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { mode } = useThemeMode();
  const session = useCustomerSession();
  const hasCustomer = Boolean(session.customer && session.accessToken);
  const hasRecoverableAccountError = Boolean(session.accessToken && session.error && !session.customer);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.tabBar, paddingTop: insets.top + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {session.status === "loading" || session.status === "signing_out" || (session.status === "refreshing" && !hasCustomer) ? (
          <LoadingState />
        ) : hasCustomer ? (
          <SignedInAccountView />
        ) : hasRecoverableAccountError ? (
          <AccountLoadError message={session.error || "Hesap bilgileri yüklenemedi."} />
        ) : (
          <>
            <AuthEntryCard />
            <SupportLinksSection />
          </>
        )}

        <Text style={{ ...typography.small, color: colors.muted, paddingHorizontal: spacing.screen, textAlign: "center" }}>
          Tık Profil v2 · Yerel işletmeleri keşfet
        </Text>
      </ScrollView>
      <ThemeModeButton currentMode={mode} top={insets.top + spacing.md} />
    </View>
  );
}

function AccountLoadError({ message }: { message: string }) {
  const { refreshCustomer, signOut } = useCustomerSession();
  return (
    <View accessibilityRole="alert" style={{ gap: spacing.lg, minHeight: 360, justifyContent: "center", paddingHorizontal: spacing.screen }}>
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Icon color={colors.danger} name="profile" size={28} />
        <Text style={{ ...typography.sectionTitle, color: colors.ink, textAlign: "center" }}>Hesap bilgileri alınamadı</Text>
        <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>{message}</Text>
      </View>
      <PrimaryButton label="Tekrar dene" onPress={() => void refreshCustomer()} />
      <View style={{ height: 48 }}><SecondaryButton label="Çıkış yap" onPress={() => void signOut()} /></View>
    </View>
  );
}

function LoadingState() {
  return (
    <View accessibilityLabel="Hesap yükleniyor" style={{ alignItems: "center", gap: spacing.md, minHeight: 360, justifyContent: "center" }}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={{ ...typography.body, color: colors.muted }}>Hesap bilgileri yükleniyor</Text>
    </View>
  );
}

function SignedInAccountView() {
  const router = useRouter();
  const { mode } = useThemeMode();
  const { customer, error: sessionError, refreshCustomer, saveAddress: persistAddress, saveProfile: persistProfile, signOut, status, updateAvatar } = useCustomerSession();
  const [profileDraft, setProfileDraft] = useState<CustomerProfileUpdate>(emptyProfile);
  const [addressDraft, setAddressDraft] = useState<CustomerAddressInput>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"address" | "avatar" | "profile" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const mounted = useRef(true);
  const initializedIdentity = useRef<string | null>(null);

  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  const profileIdentity = customer?.profile?.appUserId ?? customer?.email ?? null;
  useEffect(() => {
    if (!profileIdentity || initializedIdentity.current === profileIdentity) return;
    initializedIdentity.current = profileIdentity;
    const profile = customer?.profile;
    setProfileDraft(profile ? {
      birthDate: profile.birthDate,
      displayName: profile.displayName,
      hobbies: profile.hobbies,
      maritalStatus: profile.maritalStatus,
      occupation: profile.occupation,
      phone: profile.phone
    } : emptyProfile);
  }, [profileIdentity]);

  if (!customer) return <LoadingState />;

  const profile = customer.profile;
  const isDark = mode === "dark";
  const displayName = profile?.displayName || customer.email || "Tık Profil kullanıcısı";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TP";
  const summaryItems = [
    { icon: "mapPin" as const, label: "Adres", value: customer.addresses.length },
    { icon: "store" as const, label: "Sipariş", value: customer.orders.length },
    { icon: "clock" as const, label: "Rezervasyon", value: customer.reservations.length }
  ];

  const runSave = async (
    action: "address" | "avatar" | "profile",
    operation: () => Promise<boolean>,
    onSuccess?: () => void
  ) => {
    if (busyAction) return;
    setBusyAction(action);
    setLocalError(null);
    try {
      const completed = await operation();
      if (!mounted.current) return;
      if (completed) onSuccess?.();
    } catch (saveError) {
      if (mounted.current) {
        setLocalError(saveError instanceof Error ? saveError.message : "Hesap bilgileri kaydedilemedi.");
      }
    } finally {
      if (mounted.current) setBusyAction(null);
    }
  };

  const saveProfile = () => runSave("profile", () => persistProfile({
      ...profileDraft,
      birthDate: stringOrNull(profileDraft.birthDate),
      displayName: stringOrNull(profileDraft.displayName),
      maritalStatus: stringOrNull(profileDraft.maritalStatus),
      occupation: stringOrNull(profileDraft.occupation),
      phone: stringOrNull(profileDraft.phone)
    }));

  const pickAvatar = async () => {
    if (busyAction) return;
    selectionImpact();
    setLocalError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mounted.current) return;
    if (!permission.granted) {
      setLocalError("Profil fotoğrafı seçmek için galeri izni gerekli.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.86
    });
    if (!mounted.current) return;
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return;
    await runSave("avatar", () => updateAvatar({
        file: asset.file,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        uri: asset.uri
      }));
  };

  const beginAddress = (address?: CustomerAddress) => {
    selectionImpact();
    setOpenSection("addresses");
    setEditingAddressId(address?.id ?? "new");
    setAddressDraft(address ? {
      city: address.city,
      district: address.district,
      fullAddress: address.fullAddress,
      id: address.id,
      isDefault: address.isDefault,
      label: address.label,
      latitude: address.latitude,
      longitude: address.longitude
    } : emptyAddress);
  };

  const saveAddress = () => runSave("address", async () => {
    if (!addressDraft.label.trim() || !addressDraft.fullAddress.trim() || !addressDraft.district.trim() || !addressDraft.city.trim()) {
      throw new Error("Adres adı, detay, ilçe ve şehir alanlarını doldurun.");
    }
    return persistAddress(addressDraft);
  }, () => {
    setEditingAddressId(null);
    setAddressDraft(emptyAddress);
  });

  return (
    <View style={{ gap: spacing.lg, paddingHorizontal: spacing.screen }}>
      <View style={{
        backgroundColor: isDark ? colors.surfaceRaised : colors.ink,
        borderRadius: radii.xl,
        gap: spacing.lg,
        padding: spacing.lg,
        ...shadows.card
      }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <Pressable
            accessibilityLabel="Profil fotoğrafını değiştir"
            accessibilityRole="button"
            disabled={busyAction !== null}
            onPress={pickAvatar}
            style={({ pressed }) => ({ alignItems: "center", height: 100, justifyContent: "center", opacity: pressed ? 0.86 : 1, width: 100 })}
          >
            <View style={{
              alignItems: "center",
              backgroundColor: colors.brand,
              borderColor: colors.inverseText,
              borderRadius: radii.pill,
              borderWidth: 3,
              height: 92,
              justifyContent: "center",
              overflow: "hidden",
              width: 92
            }}>
              {profile?.avatarUrl ? (
                <Image contentFit="cover" source={{ uri: profile.avatarUrl }} style={{ height: "100%", width: "100%" }} />
              ) : (
                <Text style={{ ...typography.title, color: colors.onBrand }}>{initials}</Text>
              )}
            </View>
            <View style={{ alignItems: "center", backgroundColor: colors.brand, borderRadius: radii.pill, bottom: 2, height: 32, justifyContent: "center", position: "absolute", right: 0, width: 32 }}>
              {busyAction === "avatar" ? <ActivityIndicator color={colors.onBrand} size="small" /> : <Icon color={colors.onBrand} name="plus" size={17} />}
            </View>
          </Pressable>
          <Text numberOfLines={1} style={{ ...typography.sectionTitle, color: isDark ? colors.ink : colors.inverseText, maxWidth: "100%" }}>{displayName}</Text>
          <Text numberOfLines={1} style={{ ...typography.small, color: isDark ? colors.muted : "rgba(255,255,255,0.72)" }}>{customer.email || "E-posta bilgisi yok"}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {summaryItems.map((item) => (
            <View key={item.label} style={{ alignItems: "center", flex: 1, gap: spacing.xs, minHeight: 68, justifyContent: "center" }}>
              <Icon color={colors.brand} name={item.icon} size={18} />
              <Text style={{ ...typography.cardTitle, color: isDark ? colors.ink : colors.inverseText }}>{item.value}</Text>
              <Text adjustsFontSizeToFit numberOfLines={1} style={{ ...typography.tab, color: isDark ? colors.muted : "rgba(255,255,255,0.72)", textAlign: "center" }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {localError || sessionError ? (
        <StatusBanner message={localError || sessionError || ""} onRetry={() => void refreshCustomer()} />
      ) : status === "refreshing" ? (
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} size="small" />
          <Text style={{ ...typography.small, color: colors.muted }}>Hesap yenileniyor</Text>
        </View>
      ) : null}

      <AccountSection icon="profile" isOpen={openSection === "profile"} onToggle={() => setOpenSection(openSection === "profile" ? null : "profile")} summary={profile ? "Bilgilerini düzenle" : "Profilini tamamla"} title="Kişisel bilgiler">
        <View style={{ gap: spacing.sm }}>
          <AccountInput label="Ad soyad" onChangeText={(displayName) => setProfileDraft((value) => ({ ...value, displayName }))} value={profileDraft.displayName ?? ""} />
          <AccountInput label="Telefon" onChangeText={(phone) => setProfileDraft((value) => ({ ...value, phone }))} value={profileDraft.phone ?? ""} />
          <AccountInput label="Doğum tarihi (YYYY-AA-GG)" onChangeText={(birthDate) => setProfileDraft((value) => ({ ...value, birthDate }))} value={profileDraft.birthDate ?? ""} />
          <AccountInput label="Medeni durum" onChangeText={(maritalStatus) => setProfileDraft((value) => ({ ...value, maritalStatus }))} value={profileDraft.maritalStatus ?? ""} />
          <AccountInput label="Meslek" onChangeText={(occupation) => setProfileDraft((value) => ({ ...value, occupation }))} value={profileDraft.occupation ?? ""} />
          <AccountInput label="Hobiler (virgülle ayır)" onChangeText={(hobbies) => setProfileDraft((value) => ({ ...value, hobbies: hobbies.split(",").map((item) => item.trim()).filter(Boolean) }))} value={profileDraft.hobbies?.join(", ") ?? ""} />
          <PrimaryButton busy={busyAction === "profile"} label="Bilgileri kaydet" onPress={saveProfile} />
        </View>
      </AccountSection>

      <AccountSection icon="mapPin" isOpen={openSection === "addresses"} onToggle={() => setOpenSection(openSection === "addresses" ? null : "addresses")} summary={customer.addresses.length ? `${customer.addresses.length} kayıtlı adres` : "Adres ekle"} title="Adresler">
        <View style={{ gap: spacing.md }}>
          {customer.addresses.length === 0 && !editingAddressId ? <EmptyState icon="mapPin" message="Kayıtlı adres yok" /> : null}
          {customer.addresses.map((address) => (
            <Pressable key={address.id} accessibilityLabel={`${address.label} adresini düzenle`} accessibilityRole="button" onPress={() => beginAddress(address)} style={({ pressed }) => ({ borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.xs, minHeight: 60, justifyContent: "center", opacity: pressed ? 0.72 : 1, paddingVertical: spacing.sm })}>
              <Text style={{ ...typography.label, color: colors.ink }}>{address.label}{address.isDefault ? " · Varsayılan" : ""}</Text>
              <Text style={{ ...typography.small, color: colors.muted }}>{address.fullAddress}, {address.district} / {address.city}</Text>
            </Pressable>
          ))}
          {editingAddressId ? (
            <View style={{ gap: spacing.sm }}>
              <AccountInput label="Adres adı" onChangeText={(label) => setAddressDraft((value) => ({ ...value, label }))} value={addressDraft.label} />
              <AccountInput label="Adres detayı" multiline onChangeText={(fullAddress) => setAddressDraft((value) => ({ ...value, fullAddress }))} value={addressDraft.fullAddress} />
              <AccountInput label="İlçe" onChangeText={(district) => setAddressDraft((value) => ({ ...value, district }))} value={addressDraft.district} />
              <AccountInput label="Şehir" onChangeText={(city) => setAddressDraft((value) => ({ ...value, city }))} value={addressDraft.city} />
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <SecondaryButton label="Vazgeç" onPress={() => setEditingAddressId(null)} />
                <View style={{ flex: 1 }}><PrimaryButton busy={busyAction === "address"} label="Adresi kaydet" onPress={saveAddress} /></View>
              </View>
            </View>
          ) : (
            <PrimaryButton label="Adres ekle" onPress={() => beginAddress()} />
          )}
        </View>
      </AccountSection>

      <AccountSection icon="store" isOpen={openSection === "orders"} onToggle={() => setOpenSection(openSection === "orders" ? null : "orders")} summary={customer.orders.length ? `${customer.orders.length} sipariş` : "Sipariş yok"} title="Siparişler">
        <DataList empty="Henüz sipariş yok" icon="store">
          {customer.orders.map((order) => <DataRow key={order.id} icon="store" meta={`${order.itemCount} ürün · ${formatDate(order.createdAt)}`} status={order.status} title={order.businessName || order.orderNumber || "Sipariş"} />)}
        </DataList>
      </AccountSection>

      <AccountSection icon="clock" isOpen={openSection === "reservations"} onToggle={() => setOpenSection(openSection === "reservations" ? null : "reservations")} summary={customer.reservations.length ? `${customer.reservations.length} rezervasyon` : "Rezervasyon yok"} title="Rezervasyonlar">
        <DataList empty="Henüz rezervasyon yok" icon="clock">
          {customer.reservations.map((reservation) => <DataRow key={reservation.id} icon="clock" meta={`${formatDate(reservation.startDate)} · ${reservation.reservationType === "hotel" ? "Otel" : "Araç"}`} status={reservation.status} title={`Rezervasyon ${reservation.id.slice(0, 8)}`} />)}
        </DataList>
      </AccountSection>

      <AnimatedPressable accessibilityRole="button" onPress={() => router.push("/favorites")} pressScale={0.97} style={{ alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 58 }}>
        <Icon color={colors.brand} name="heart" size={20} />
        <Text style={{ ...typography.body, color: colors.ink, flex: 1 }}>Favoriler</Text>
        <Icon color={colors.muted} name="chevron" size={16} />
      </AnimatedPressable>

      <SupportLinksSection compact />
      <SecondaryButton label="Çıkış yap" onPress={() => void signOut()} />
    </View>
  );
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function AccountSection({ children, icon, isOpen, onToggle, summary, title }: { children: ReactNode; icon: IconName; isOpen: boolean; onToggle: () => void; summary: string; title: string }) {
  return (
    <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}>
      <AnimatedPressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={onToggle} pressScale={0.985} style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 64, paddingVertical: spacing.sm }}>
        <Icon color={colors.brand} name={icon} size={20} />
        <View style={{ flex: 1 }}><Text style={{ ...typography.cardTitle, color: colors.ink }}>{title}</Text><Text style={{ ...typography.small, color: colors.muted }}>{summary}</Text></View>
        <Icon color={colors.muted} name="chevronDown" size={16} />
      </AnimatedPressable>
      {isOpen ? <View style={{ paddingBottom: spacing.lg }}>{children}</View> : null}
    </View>
  );
}

function AccountInput({ label, multiline = false, onChangeText, value }: { label: string; multiline?: boolean; onChangeText: (value: string) => void; value: string }) {
  return (
    <View style={{ borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
      <Text style={{ ...typography.small, color: colors.muted }}>{label}</Text>
      <TextInput accessibilityLabel={label} cursorColor={colors.brand} multiline={multiline} onChangeText={onChangeText} selectionColor={colors.brandSoft} style={[{ ...typography.body, color: colors.ink, minHeight: multiline ? 56 : 36, textAlignVertical: multiline ? "top" : "center" }, { outlineColor: "transparent", outlineStyle: "none", outlineWidth: 0 } as never]} value={value} />
    </View>
  );
}

function PrimaryButton({ busy = false, label, onPress }: { busy?: boolean; label: string; onPress: () => void }) {
  return <AnimatedPressable accessibilityRole="button" disabled={busy} onPress={onPress} pressScale={0.97} style={({ pressed }) => ({ alignItems: "center", backgroundColor: colors.brand, borderRadius: radii.md, justifyContent: "center", minHeight: 48, opacity: busy ? 0.62 : pressed ? 0.88 : 1, paddingHorizontal: spacing.lg })}>{busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={{ ...typography.button, color: colors.onBrand }}>{label}</Text>}</AnimatedPressable>;
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <AnimatedPressable accessibilityRole="button" onPress={onPress} pressScale={0.97} style={({ pressed }) => ({ alignItems: "center", borderColor: colors.borderStrong, borderRadius: radii.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48, opacity: pressed ? 0.8 : 1, paddingHorizontal: spacing.lg })}><Text style={{ ...typography.button, color: colors.brandDeep }}>{label}</Text></AnimatedPressable>;
}

function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return <View style={{ alignItems: "center", gap: spacing.sm, minHeight: 110, justifyContent: "center" }}><Icon color={colors.muted} name={icon} size={24} /><Text style={{ ...typography.small, color: colors.muted }}>{message}</Text></View>;
}

function DataList({ children, empty, icon }: { children: ReactNode; empty: string; icon: IconName }) {
  const list = Array.isArray(children) ? children : [children];
  return list.length && list.some(Boolean) ? <View>{children}</View> : <EmptyState icon={icon} message={empty} />;
}

function DataRow({ icon, meta, status, title }: { icon: IconName; meta: string; status: string; title: string }) {
  return <View style={{ alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 66, paddingVertical: spacing.sm }}><Icon color={colors.brand} name={icon} size={19} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ ...typography.label, color: colors.ink }}>{title}</Text><Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>{meta}</Text></View><Text numberOfLines={1} style={{ ...typography.tab, color: colors.brand, maxWidth: 92 }}>{status}</Text></View>;
}

function StatusBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View accessibilityRole="alert" style={{ alignItems: "center", backgroundColor: colors.brandSoft, borderColor: colors.borderStrong, borderRadius: radii.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md }}><Text style={{ ...typography.small, color: colors.danger, flex: 1 }}>{message}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ ...typography.label, color: colors.brandDeep }}>Tekrar dene</Text></Pressable></View>;
}

function SupportLinksSection({ compact = false }: { compact?: boolean }) {
  return <View style={{ marginHorizontal: compact ? 0 : spacing.screen }}>{links.map((link) => <AnimatedPressable accessibilityRole="button" key={link.label} onPress={selectionImpact} pressScale={0.985} style={{ alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 52 }}><Icon color={colors.muted} name={link.icon} size={18} /><Text style={{ ...typography.body, color: colors.ink, flex: 1 }}>{link.label}</Text><Icon color={colors.muted} name="chevron" size={16} /></AnimatedPressable>)}</View>;
}

function ThemeModeButton({ currentMode, top }: { currentMode: "light" | "dark"; top: number }) {
  const { setMode } = useThemeMode();
  const isDark = currentMode === "dark";
  return <Pressable accessibilityLabel={isDark ? "Açık temaya geç" : "Koyu temaya geç"} accessibilityRole="button" onPress={() => setMode(isDark ? "light" : "dark")} style={({ pressed }) => ({ alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: "center", opacity: pressed ? 0.8 : 1, position: "absolute", right: spacing.screen, top, width: 44, ...shadows.soft })}><Icon color={colors.brand} name={isDark ? "sun" : "moon"} size={19} /></Pressable>;
}
