import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type CustomerAddress,
  type CustomerAddressInput,
  type CustomerProfileUpdate
} from "@/api/customer";
import { cancelAppointment } from "@/api/appointments";
import { cancelListingInquiry } from "@/api/listings";
import { cancelReservation } from "@/api/reservations";
import { getAccountLayout, resolveAccountFontScale } from "@/account/account-layout";
import { useCustomerSession } from "@/auth/auth-store";
import { AuthEntryCard } from "@/components/account/AuthEntryCard";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, interaction, radii, shadows, spacing, typography, type ThemeMode } from "@/theme/tokens";
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
      <ThemeModeFloatingButton currentMode={mode} top={insets.top + spacing.md} />
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
  const params = useLocalSearchParams<{ task8FontScale?: string | string[] }>();
  const { fontScale: runtimeFontScale } = useWindowDimensions();
  const requestedFontScale = Array.isArray(params.task8FontScale) ? params.task8FontScale[0] : params.task8FontScale;
  const fontScale = resolveAccountFontScale(
    runtimeFontScale,
    requestedFontScale ? `?task8FontScale=${encodeURIComponent(requestedFontScale)}` : "",
    process.env.EXPO_PUBLIC_TASK8_BROWSER_FIXTURES === "1"
  );
  const accountLayout = getAccountLayout(fontScale);
  const { mode } = useThemeMode();
  const { customer, error: sessionError, refreshCustomer, runAuthenticated, saveAddress: persistAddress, saveProfile: persistProfile, signOut, status, updateAvatar } = useCustomerSession();
  const [profileDraft, setProfileDraft] = useState<CustomerProfileUpdate>(emptyProfile);
  const [addressDraft, setAddressDraft] = useState<CustomerAddressInput>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"address" | "avatar" | "profile" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [cancellingInquiryId, setCancellingInquiryId] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);
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
          <AnimatedPressable
            accessibilityLabel="Profil fotoğrafını değiştir"
            accessibilityRole="button"
            accessibilityState={{ busy: busyAction === "avatar", disabled: busyAction !== null }}
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
          </AnimatedPressable>
          <Text numberOfLines={2} style={{ ...typography.sectionTitle, color: isDark ? colors.ink : colors.inverseText, maxWidth: "100%", textAlign: "center" }}>{displayName}</Text>
          <Text numberOfLines={2} style={{ ...typography.small, color: isDark ? colors.muted : "rgba(255,255,255,0.72)", textAlign: "center" }}>{customer.email || "E-posta bilgisi yok"}</Text>
        </View>

        <View style={{ flexDirection: accountLayout.summaryDirection, gap: spacing.sm }} testID="account-summary">
          {summaryItems.map((item) => (
            <View key={item.label} style={{ alignItems: "center", flex: 1, gap: spacing.xs, minHeight: 68, justifyContent: "center" }} testID={`account-summary-${item.label}`}>
              <Icon color={colors.brand} name={item.icon} size={18} />
              <Text style={{ ...typography.cardTitle, color: isDark ? colors.ink : colors.inverseText }}>{item.value}</Text>
              <Text style={{ ...typography.tab, color: isDark ? colors.muted : "rgba(255,255,255,0.72)", textAlign: "center" }}>{item.label}</Text>
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
            <AnimatedPressable key={address.id} accessibilityLabel={`${address.label} adresini düzenle`} accessibilityRole="button" onPress={() => beginAddress(address)} style={{ borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.xs, minHeight: 60, justifyContent: "center", paddingVertical: spacing.sm }}>
              <Text style={{ ...typography.label, color: colors.ink }}>{address.label}{address.isDefault ? " · Varsayılan" : ""}</Text>
              <Text style={{ ...typography.small, color: colors.muted }}>{address.fullAddress}, {address.district} / {address.city}</Text>
            </AnimatedPressable>
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

      <AccountSection icon="store" isOpen={openSection === "orders"} onToggle={() => {
        const isOpening = openSection !== "orders";
        setOpenSection(isOpening ? "orders" : null);
        if (isOpening) void refreshCustomer();
      }} summary={customer.orders.length ? `${customer.orders.length} sipariş` : "Sipariş yok"} title="Siparişler">
        <DataList empty="Henüz sipariş yok" icon="store">
          {customer.orders.map((order) => <DataRow key={order.id} icon="store" meta={`${order.itemCount} ürün · ${formatDate(order.createdAt)}`} status={order.status} title={order.businessName || order.orderNumber || "Sipariş"} />)}
        </DataList>
      </AccountSection>

      <AccountSection icon="clock" isOpen={openSection === "reservations"} onToggle={() => {
        const isOpening = openSection !== "reservations";
        setOpenSection(isOpening ? "reservations" : null);
        if (isOpening) void refreshCustomer();
      }} summary={customer.reservations.length ? `${customer.reservations.length} rezervasyon` : "Rezervasyon yok"} title="Rezervasyonlar">
        <DataList empty="Henüz rezervasyon yok" icon="clock">
          {customer.reservations.map((reservation) => (
            <View key={reservation.id} style={{ borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.sm, paddingVertical: spacing.md }}>
              <DataRow
                icon="clock"
                meta={`${formatDate(reservation.startDate)} · ${reservation.reservationType === "hotel" ? "Otel" : reservation.reservationType === "restaurant" ? "Restoran" : "Araç"}`}
                status={reservation.status}
                title={`${reservation.businessName} · ${reservation.resourceName}`}
              />
              {reservation.cancellable ? (
                <AnimatedPressable
                  accessibilityLabel={`${reservation.resourceName} rezervasyonunu iptal et`}
                  accessibilityRole="button"
                  disabled={cancellingReservationId === reservation.id}
                  onPress={() => {
                    Alert.alert(
                      "Rezervasyonu iptal et",
                      `${reservation.resourceName} rezervasyonunu iptal etmek istediğinize emin misiniz?`,
                      [
                        { style: "cancel", text: "Vazgeç" },
                        {
                          style: "destructive",
                          text: "İptal et",
                          onPress: () => {
                            setCancellingReservationId(reservation.id);
                            setLocalError(null);
                            void (async () => {
                              try {
                                const cancelled = await runAuthenticated((accessToken) => cancelReservation(accessToken, reservation.id));
                                if (!cancelled) throw new Error("Oturum doğrulanamadı. Yeniden giriş yapın.");
                                await refreshCustomer();
                              } catch (error) {
                                setLocalError(error instanceof Error ? error.message : "Rezervasyon iptal edilemedi.");
                              } finally {
                                setCancellingReservationId(null);
                              }
                            })();
                          }
                        }
                      ]
                    );
                  }}
                  style={{ alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.brandSoft, borderRadius: radii.pill, justifyContent: "center", minHeight: 38, paddingHorizontal: spacing.md }}
                >
                  <Text style={{ ...typography.label, color: colors.brandDeep }}>{cancellingReservationId === reservation.id ? "İptal ediliyor" : "Rezervasyonu iptal et"}</Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ))}
        </DataList>
      </AccountSection>

      <AccountSection icon="clock" isOpen={openSection === "appointments"} onToggle={() => {
        const isOpening = openSection !== "appointments";
        setOpenSection(isOpening ? "appointments" : null);
        if (isOpening) void refreshCustomer();
      }} summary={customer.appointments.length ? `${customer.appointments.length} randevu` : "Randevu yok"} title="Randevular">
        <DataList empty="Henüz randevu yok" icon="clock">
          {customer.appointments.map((appointment) => (
            <View key={appointment.id} style={{ borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.sm, paddingVertical: spacing.md }}>
              <DataRow
                icon="clock"
                meta={`${formatDate(appointment.date)} · ${appointment.time} · ${appointment.staffName}`}
                status={appointment.status}
                title={`${appointment.businessName} · ${appointment.serviceName}`}
              />
              {appointment.cancellable ? (
                <AnimatedPressable
                  accessibilityLabel={`${appointment.serviceName} randevusunu iptal et`}
                  accessibilityRole="button"
                  disabled={cancellingAppointmentId === appointment.id}
                  onPress={() => {
                    Alert.alert(
                      "Randevuyu iptal et",
                      `${appointment.serviceName} randevusunu iptal etmek istediğinize emin misiniz?`,
                      [
                        { style: "cancel", text: "Vazgeç" },
                        {
                          style: "destructive",
                          text: "İptal et",
                          onPress: () => {
                            setCancellingAppointmentId(appointment.id);
                            setLocalError(null);
                            void (async () => {
                              try {
                                const cancelled = await runAuthenticated((accessToken) => cancelAppointment(accessToken, appointment.id));
                                if (!cancelled) throw new Error("Oturum doğrulanamadı. Yeniden giriş yapın.");
                                await refreshCustomer();
                              } catch (error) {
                                setLocalError(error instanceof Error ? error.message : "Randevu iptal edilemedi.");
                              } finally {
                                setCancellingAppointmentId(null);
                              }
                            })();
                          }
                        }
                      ]
                    );
                  }}
                  style={{ alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.brandSoft, borderRadius: radii.pill, minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.md }}
                >
                  <Text style={{ ...typography.label, color: colors.brandDeep }}>
                    {cancellingAppointmentId === appointment.id ? "İptal ediliyor" : "Randevuyu iptal et"}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ))}
        </DataList>
      </AccountSection>

      <AccountSection icon="home" isOpen={openSection === "inquiries"} onToggle={() => {
        const isOpening = openSection !== "inquiries";
        setOpenSection(isOpening ? "inquiries" : null);
        if (isOpening) void refreshCustomer();
      }} summary={customer.inquiries.length ? `${customer.inquiries.length} talep` : "İlan talebi yok"} title="İlan talepleri">
        <DataList empty="Henüz ilan talebi yok" icon="home">
          {customer.inquiries.map((inquiry) => (
            <View key={inquiry.id} style={{ borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.sm, paddingVertical: spacing.md }}>
              <DataRow
                icon="home"
                meta={`${inquiry.businessName} · ${formatMoney(inquiry.listingPrice, inquiry.listingCurrency)} · ${formatDate(inquiry.createdAt)}`}
                status={inquiry.status}
                title={inquiry.listingTitle}
              />
              {inquiry.cancellable ? (
                <AnimatedPressable
                  accessibilityLabel={`${inquiry.listingTitle} ilan talebini iptal et`}
                  accessibilityRole="button"
                  disabled={cancellingInquiryId === inquiry.id}
                  onPress={() => {
                    Alert.alert(
                      "İlan talebini iptal et",
                      `${inquiry.listingTitle} için gönderdiğiniz talebi iptal etmek istediğinize emin misiniz?`,
                      [
                        { style: "cancel", text: "Vazgeç" },
                        {
                          style: "destructive",
                          text: "İptal et",
                          onPress: () => {
                            setCancellingInquiryId(inquiry.id);
                            setLocalError(null);
                            void (async () => {
                              try {
                                const cancelled = await runAuthenticated((accessToken) => cancelListingInquiry(accessToken, inquiry.id));
                                if (!cancelled) throw new Error("Oturum doğrulanamadı. Yeniden giriş yapın.");
                                await refreshCustomer();
                              } catch (error) {
                                setLocalError(error instanceof Error ? error.message : "İlan talebi iptal edilemedi.");
                              } finally {
                                setCancellingInquiryId(null);
                              }
                            })();
                          }
                        }
                      ]
                    );
                  }}
                  style={{ alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.brandSoft, borderRadius: radii.pill, justifyContent: "center", minHeight: 38, paddingHorizontal: spacing.md }}
                >
                  <Text style={{ ...typography.label, color: colors.brandDeep }}>
                    {cancellingInquiryId === inquiry.id ? "İptal ediliyor" : "Talebi iptal et"}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ))}
        </DataList>
      </AccountSection>

      <AnimatedPressable accessibilityLabel="Favoriler sekmesine git" accessibilityRole="button" onPress={() => router.navigate("/favorites" as never)} pressScale={0.98} style={{ alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 58 }}>
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

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", { currency, style: "currency", maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString("tr-TR")} ${currency}`;
  }
}

function AccountSection({ children, icon, isOpen, onToggle, summary, title }: { children: ReactNode; icon: IconName; isOpen: boolean; onToggle: () => void; summary: string; title: string }) {
  return (
    <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}>
      <AnimatedPressable accessibilityLabel={`${title}, ${summary}`} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} aria-expanded={isOpen} onPress={onToggle} pressScale={0.98} style={{ alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 64, paddingVertical: spacing.sm }}>
        <Icon color={colors.brand} name={icon} size={20} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ ...typography.cardTitle, color: colors.ink }}>{title}</Text><Text style={{ ...typography.small, color: colors.muted }}>{summary}</Text></View>
        <View style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}><Icon color={colors.muted} name="chevronDown" size={16} /></View>
      </AnimatedPressable>
      {isOpen ? <View style={{ paddingBottom: spacing.lg }}>{children}</View> : null}
    </View>
  );
}

function AccountInput({ label, multiline = false, onChangeText, value }: { label: string; multiline?: boolean; onChangeText: (value: string) => void; value: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
      <Text style={{ ...typography.small, color: colors.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        cursorColor={colors.brand}
        multiline={multiline}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        selectionColor={colors.brandSoft}
        style={[{
          ...typography.body,
          color: colors.ink,
          minHeight: multiline ? 64 : interaction.minTouchTarget,
          outlineColor: focused ? colors.focusRing : "transparent",
          outlineOffset: 2,
          outlineStyle: "solid",
          outlineWidth: focused ? 3 : 0,
          textAlignVertical: multiline ? "top" : "center"
        }]}
        value={value}
      />
    </View>
  );
}

function PrimaryButton({ busy = false, label, onPress }: { busy?: boolean; label: string; onPress: () => void }) {
  return <AnimatedPressable accessibilityLabel={busy ? `${label}, işlem sürüyor` : label} accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onPress} pressScale={0.98} style={{ alignItems: "center", backgroundColor: colors.brand, borderRadius: radii.md, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }}>{busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={{ ...typography.button, color: colors.onBrand }}>{label}</Text>}</AnimatedPressable>;
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <AnimatedPressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} pressScale={0.98} style={{ alignItems: "center", borderColor: colors.borderStrong, borderRadius: radii.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }}><Text style={{ ...typography.button, color: colors.brandDeep }}>{label}</Text></AnimatedPressable>;
}

function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return <View style={{ alignItems: "center", gap: spacing.sm, minHeight: 110, justifyContent: "center" }}><Icon color={colors.muted} name={icon} size={24} /><Text style={{ ...typography.small, color: colors.muted }}>{message}</Text></View>;
}

function DataList({ children, empty, icon }: { children: ReactNode; empty: string; icon: IconName }) {
  const list = Array.isArray(children) ? children : [children];
  return list.length && list.some(Boolean) ? <View>{children}</View> : <EmptyState icon={icon} message={empty} />;
}

function DataRow({ icon, meta, status, title }: { icon: IconName; meta: string; status: string; title: string }) {
  const { fontScale } = useWindowDimensions();
  const layout = getAccountLayout(fontScale);
  return <View style={{ alignItems: layout.largeText ? "flex-start" : "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: layout.dataRowDirection, gap: spacing.sm, minHeight: 66, paddingVertical: spacing.sm }}><Icon color={colors.brand} name={icon} size={19} /><View style={{ flex: layout.largeText ? undefined : 1, minWidth: 0, width: layout.largeText ? "100%" : undefined }}><Text numberOfLines={2} style={{ ...typography.label, color: colors.ink }}>{title}</Text><Text numberOfLines={2} style={{ ...typography.small, color: colors.muted }}>{meta}</Text></View><Text numberOfLines={2} style={{ ...typography.tab, color: colors.brand }}>{status}</Text></View>;
}

function StatusBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View accessibilityRole="alert" style={{ alignItems: "center", backgroundColor: colors.brandSoft, borderColor: colors.borderStrong, borderRadius: radii.md, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md }}><Text style={{ ...typography.small, color: colors.danger, flex: 1, minWidth: 180 }}>{message}</Text><AnimatedPressable accessibilityLabel="Hesabı tekrar yükle" accessibilityRole="button" onPress={onRetry} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ ...typography.label, color: colors.brandDeep }}>Tekrar dene</Text></AnimatedPressable></View>;
}

function SupportLinksSection({ compact = false }: { compact?: boolean }) {
  return <View style={{ marginHorizontal: compact ? 0 : spacing.screen }}>{links.map((link) => <View key={link.label} style={{ alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 52 }}><Icon color={colors.muted} name={link.icon} size={18} /><Text style={{ ...typography.body, color: colors.muted, flex: 1 }}>{link.label}</Text></View>)}</View>;
}

function ThemeModeFloatingButton({ currentMode, top }: { currentMode: ThemeMode; top: number }) {
  const { isReady, setMode } = useThemeMode();
  const isDarkMode = currentMode === "dark";

  return (
    <AnimatedPressable
      accessibilityLabel={isDarkMode ? "Açık temaya geç" : "Koyu temaya geç"}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isReady }}
      disabled={!isReady}
      onPress={() => {
        selectionImpact();
        setMode(isDarkMode ? "light" : "dark");
      }}
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: !isReady ? 0.72 : pressed ? 0.84 : 1,
        position: "absolute",
        right: spacing.screen,
        top,
        height: 44,
        width: 44,
        zIndex: 20
      })}
    >
      <View style={{
        alignItems: "center",
        backgroundColor: isDarkMode ? colors.backgroundAlt : colors.surface,
        borderColor: isDarkMode ? "rgba(255,191,65,0.42)" : "rgba(238,6,80,0.30)",
        borderRadius: radii.pill,
        borderWidth: 1,
        height: 36,
        justifyContent: "center",
        width: 36,
        boxShadow: isDarkMode
          ? "0 3px 10px rgba(0,0,0,0.20), 0 0 0 1px rgba(255,191,65,0.12)"
          : "0 7px 16px rgba(238,6,80,0.18)"
      }}>
        <ThemeOrbGraphic isDarkMode={isDarkMode} />
      </View>
    </AnimatedPressable>
  );
}

function ThemeOrbGraphic({ isDarkMode }: { isDarkMode: boolean }) {
  const sky = isDarkMode ? "#000000" : "#EE0650";
  const wave = isDarkMode ? colors.surfaceRaised : colors.surface;
  const ground = isDarkMode ? colors.backgroundAlt : colors.brandSoft;
  const bodyId = isDarkMode ? "nightOrbGlow" : "dayOrbGlow";
  const clipId = isDarkMode ? "nightOrbClip" : "dayOrbClip";

  return (
    <Svg width={32} height={32} viewBox="0 0 48 48">
      <Defs>
        <RadialGradient id={bodyId} cx="35%" cy="24%" r="75%">
          <Stop offset="0%" stopColor={isDarkMode ? "#2B2B2B" : "#FF4B86"} />
          <Stop offset="100%" stopColor={sky} />
        </RadialGradient>
        <ClipPath id={clipId}>
          <Circle cx="24" cy="24" r="22.4" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Circle cx="24" cy="24" r="23" fill={`url(#${bodyId})`} />
        <Path d="M1.2 29.5 C9 27.5 14.5 25.8 21 27.2 C27 28.5 31 32.4 37 30.3 C40.8 29 44.5 28.7 46.8 29.5 L46.8 46.8 L1.2 46.8 Z" fill={wave} opacity={isDarkMode ? 0.78 : 0.9} />
        <Path d="M1.2 33.2 C10 31.7 16 32.5 23 34.5 C30 36.5 37.5 35.5 46.8 32.7 L46.8 46.8 L1.2 46.8 Z" fill={ground} opacity={0.96} />
        {isDarkMode ? (
          <>
            <Circle cx="34.8" cy="16.2" r="5.4" fill="#FFBF41" />
            <Circle cx="37" cy="14.4" r="5.4" fill={sky} />
          </>
        ) : (
          <>
            <Circle cx="35" cy="16" r="4.2" fill="#FFFFFF" />
            <Line x1="35" y1="8.7" x2="35" y2="6.2" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
            <Line x1="35" y1="25.8" x2="35" y2="23.3" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
            <Line x1="27.7" y1="16" x2="25.2" y2="16" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
            <Line x1="44.8" y1="16" x2="42.3" y2="16" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
            <Line x1="29.8" y1="10.8" x2="28.1" y2="9.1" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
            <Line x1="41.9" y1="22.9" x2="40.2" y2="21.2" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
            <Line x1="40.2" y1="10.8" x2="41.9" y2="9.1" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
            <Line x1="28.1" y1="22.9" x2="29.8" y2="21.2" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.4" />
          </>
        )}
      </G>
      <Circle cx="24" cy="24" r="23" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
    </Svg>
  );
}
