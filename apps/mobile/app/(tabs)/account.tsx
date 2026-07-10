import { useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadAccountAvatar } from "@/api/account";
import { AuthEntryCard } from "@/components/account/AuthEntryCard";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography, type ThemeMode } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { selectionImpact } from "@/utils/haptics";

const links = [
  { label: "Yardım merkezi", icon: "compass" as const },
  { label: "Gizlilik politikası", icon: "spark" as const },
  { label: "Kullanım şartları", icon: "menu" as const }
];

const accountPreview = {
  name: "Tık Profil Kullanıcısı",
  email: "kullanici@tikprofil.com",
  phone: "+90 555 000 52 52",
  address: "Altınordu, Ordu",
  initials: "TP"
};

const personalInfo = [
  { label: "Ad - Soyad", value: "Tık Profil Kullanıcısı" },
  { label: "Doğum günü", value: "12 Mayıs 1992" },
  { label: "Medeni durum", value: "Belirtilmedi" },
  { label: "Meslek", value: "Yerel işletme takipçisi" },
  { label: "Hobiler", value: "Kahve, yeni mekanlar, şehir rehberleri" }
];

interface AddressItem {
  id: string;
  label: string;
  value: string;
}

interface AddressDraft {
  label: string;
  value: string;
}

const savedAddresses: AddressItem[] = [
  { id: "home", label: "Ev", value: "Akyazı Mah., Altınordu / Ordu" },
  { id: "work", label: "İş", value: "Düz Mah., Süleyman Felek Cd. / Ordu" }
];

const recentOrders = [
  { title: "BEBEK BURGER AKYAZI", meta: "18 Haziran · 2 ürün", status: "Teslim edildi" },
  { title: "MANCHEGO AKYAZI", meta: "14 Haziran · Kahve siparişi", status: "Teslim edildi" }
];

const recentReservations = [
  { title: "ALAZ RESTORAN ORDU", meta: "15 Haziran · 2 kişi", status: "Tamamlandı" },
  { title: "Manchego Coffee Pastry", meta: "10 Haziran · 19:30", status: "Tamamlandı" }
];

const profileCoupons = [
  { title: "Tık Profil Kahve Kuponu", value: "%15", detail: "Kahve shop kategorisinde geçerli" },
  { title: "QR Menü Fırsatı", value: "2x", detail: "Seçili işletmelerde ikinci içecek avantajı" }
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { mode } = useThemeMode();
  const [isSignedIn, setIsSignedIn] = useState(true);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          gap: spacing.xl,
          paddingBottom: spacing.tabBar,
          paddingTop: insets.top + spacing.xl
        }}
        showsVerticalScrollIndicator={false}
      >
        {isSignedIn ? (
          <SignedInAccountView onLogout={() => setIsSignedIn(false)} />
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

function SignedInAccountView({ onLogout }: { onLogout: () => void }) {
  const { mode } = useThemeMode();
  const router = useRouter();
  const isDarkMode = mode === "dark";
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [editingInfoLabel, setEditingInfoLabel] = useState<string | null>(null);
  const [addressItems, setAddressItems] = useState<AddressItem[]>(() => savedAddresses);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>({ label: "", value: "" });
  const [profilePhotoAsset, setProfilePhotoAsset] = useState<ImagePicker.ImagePickerAsset | undefined>();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>();
  const [profilePhotoError, setProfilePhotoError] = useState<string | undefined>();
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [personalInfoValues, setPersonalInfoValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(personalInfo.map((item) => [item.label, item.value]))
  );
  const displayName = personalInfoValues["Ad - Soyad"] || accountPreview.name;
  const profession = personalInfoValues["Meslek"] || "Yerel işletme takipçisi";
  const profilePhotoUri = profilePhotoAsset?.uri || profilePhotoUrl;
  const summaryItems = [
    { label: "Adres", value: `${addressItems.length}`, icon: "mapPin" as const },
    { label: "Sipariş", value: "6", icon: "store" as const },
    { label: "Rezervasyon", value: `${recentReservations.length}`, icon: "clock" as const }
  ];
  const pickProfilePhoto = async () => {
    if (isUploadingProfilePhoto) return;

    selectionImpact();
    setProfilePhotoError(undefined);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfilePhotoError("Profil fotoğrafı seçmek için galeri izni gerekli.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.86
    });

    if (result.canceled || !result.assets?.[0]) return;

    const selectedPhoto = result.assets[0];
    setProfilePhotoAsset(selectedPhoto);

    setIsUploadingProfilePhoto(true);
    try {
      const uploadedUrl = await uploadAccountAvatar({
        uri: selectedPhoto.uri,
        file: selectedPhoto.file,
        fileName: selectedPhoto.fileName,
        fileSize: selectedPhoto.fileSize,
        mimeType: selectedPhoto.mimeType
      });
      setProfilePhotoUrl(uploadedUrl);
    } catch (error) {
      setProfilePhotoError(error instanceof Error ? error.message : "Profil fotoğrafı yüklenemedi.");
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  };
  const toggleSection = (section: string) => {
    selectionImpact();
    setEditingInfoLabel(null);
    setEditingAddressId(null);
    setOpenSection((current) => (current === section ? null : section));
  };
  const beginAddressEdit = (address: AddressItem) => {
    selectionImpact();
    setEditingInfoLabel(null);
    setEditingAddressId(address.id);
    setAddressDraft({ label: address.label, value: address.value });
  };
  const addAddress = () => {
    selectionImpact();
    const newAddress = { id: `address-${Date.now()}`, label: "Yeni adres", value: "" };
    setOpenSection("addresses");
    setAddressItems((current) => [newAddress, ...current]);
    setEditingAddressId(newAddress.id);
    setAddressDraft({ label: newAddress.label, value: newAddress.value });
  };
  const saveAddress = () => {
    if (!editingAddressId) return;

    selectionImpact();
    const nextLabel = addressDraft.label.trim() || "Adres";
    const nextValue = addressDraft.value.trim() || "Adres detayı eklenmedi";
    setAddressItems((current) =>
      current.map((address) =>
        address.id === editingAddressId ? { ...address, label: nextLabel, value: nextValue } : address
      )
    );
    setEditingAddressId(null);
  };
  const deleteAddress = (id: string) => {
    selectionImpact();
    setAddressItems((current) => current.filter((address) => address.id !== id));
    if (editingAddressId === id) {
      setEditingAddressId(null);
    }
  };

  return (
    <View style={{ gap: spacing.lg, paddingHorizontal: spacing.screen }}>
      <View style={{
        backgroundColor: isDarkMode ? colors.surfaceRaised : colors.ink,
        borderColor: isDarkMode ? colors.border : "rgba(255,255,255,0.08)",
        borderRadius: radii.xxl,
        borderWidth: 1,
        overflow: "hidden",
        padding: spacing.lg,
        ...shadows.card
      }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <ProfilePhotoButton
            initials={accountPreview.initials}
            isBusy={isUploadingProfilePhoto}
            isDarkMode={isDarkMode}
            onPress={pickProfilePhoto}
            uri={profilePhotoUri}
          />

          <View style={{ alignItems: "center", gap: spacing.xs, maxWidth: "100%" }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs, justifyContent: "center" }}>
              <Text
                numberOfLines={1}
                style={{
                  ...typography.sectionTitle,
                  color: isDarkMode ? colors.ink : colors.inverseText,
                  flexShrink: 1,
                  maxWidth: 240,
                  textAlign: "center"
                }}
              >
                {displayName}
              </Text>
              <Icon name="verified" color={colors.brand} size={18} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                ...typography.small,
                color: isDarkMode ? colors.muted : "rgba(255,255,255,0.72)",
                textAlign: "center"
              }}
            >
              {profession}
            </Text>
            {profilePhotoError ? (
              <Text style={{ ...typography.small, color: colors.danger, textAlign: "center" }}>
                {profilePhotoError}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{
          backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.10)",
          borderColor: isDarkMode ? colors.border : "rgba(255,255,255,0.12)",
          borderRadius: radii.xl,
          borderWidth: 1,
          flexDirection: "row",
          gap: spacing.sm,
          marginTop: spacing.lg,
          padding: spacing.sm
        }}>
          {summaryItems.map((item) => (
            <View
              key={item.label}
              style={{
                alignItems: "center",
                backgroundColor: isDarkMode ? colors.backgroundAlt : "rgba(255,255,255,0.10)",
                borderRadius: radii.lg,
                flex: 1,
                gap: spacing.xs,
                minHeight: 76,
                justifyContent: "center",
                paddingHorizontal: spacing.xs
              }}
            >
              <Icon
                name={item.icon}
                color={isDarkMode ? colors.brand : colors.brand}
                size={18}
                strokeWidth={2.3}
              />
              <Text style={{
                ...typography.sectionTitle,
                color: isDarkMode ? colors.ink : colors.inverseText,
                lineHeight: 22
              }}>
                {item.value}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  ...typography.tab,
                  color: isDarkMode ? colors.muted : "rgba(255,255,255,0.72)",
                  textAlign: "center"
                }}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ProfileSection
        icon="profile"
        isOpen={openSection === "personal"}
        onToggle={() => toggleSection("personal")}
        summary={`${personalInfo.length} bilgi`}
        title="Kişisel Bilgiler"
      >
        <View style={{ gap: spacing.sm }}>
          {personalInfo.map((item) => (
            <EditableInfoRow
              isEditing={editingInfoLabel === item.label}
              key={item.label}
              label={item.label}
              multiline={item.label === "Hobiler"}
              onChangeText={(value) => {
                setPersonalInfoValues((current) => ({ ...current, [item.label]: value }));
              }}
              onDone={() => setEditingInfoLabel(null)}
              onEdit={() => {
                selectionImpact();
                setEditingInfoLabel(item.label);
              }}
              value={personalInfoValues[item.label] ?? item.value}
            />
          ))}
        </View>
      </ProfileSection>

      <ProfileSection
        icon="mapPin"
        isOpen={openSection === "addresses"}
        onToggle={() => toggleSection("addresses")}
        summary={addressItems.length > 0 ? `${addressItems.length} kayıtlı adres` : "Adres ekle"}
        title="Adresler"
      >
        <View style={{ gap: spacing.sm }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.label, color: colors.ink }}>Kayıtlı adresler</Text>
              <Text style={{ ...typography.small, color: colors.muted }}>Adreslerini buradan yönet</Text>
            </View>
            <AnimatedPressable
              accessibilityRole="button"
              onPress={addAddress}
              pressScale={0.96}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.brand,
                borderRadius: radii.pill,
                flexDirection: "row",
                gap: spacing.xs,
                minHeight: 36,
                opacity: pressed ? 0.88 : 1,
                paddingHorizontal: spacing.md
              })}
            >
              <Icon name="plus" color={colors.onBrand} size={16} strokeWidth={2.5} />
              <Text style={{ ...typography.small, color: colors.onBrand }}>Adres ekle</Text>
            </AnimatedPressable>
          </View>

          {addressItems.length === 0 ? (
            <EmptyAddressState onAdd={addAddress} />
          ) : null}

          {addressItems.map((address) => (
            <EditableAddressCard
              address={address}
              draft={addressDraft}
              isEditing={editingAddressId === address.id}
              key={address.id}
              onCancel={() => {
                selectionImpact();
                setEditingAddressId(null);
              }}
              onDelete={() => deleteAddress(address.id)}
              onDraftChange={(draft) => setAddressDraft((current) => ({ ...current, ...draft }))}
              onEdit={() => beginAddressEdit(address)}
              onSave={saveAddress}
            />
          ))}
        </View>
      </ProfileSection>

      <ProfileSection
        icon="store"
        isOpen={openSection === "orders"}
        onToggle={() => toggleSection("orders")}
        summary="Son siparişler"
        title="Siparişler"
      >
        <View style={{ gap: spacing.sm }}>
          {recentOrders.map((order) => (
            <CompactDataCard
              key={order.title}
              icon="store"
              title={order.title}
              meta={order.meta}
              status={order.status}
            />
          ))}
        </View>
      </ProfileSection>

      <ProfileSection
        icon="clock"
        isOpen={openSection === "reservations"}
        onToggle={() => toggleSection("reservations")}
        summary="Son rezervasyonlar"
        title="Rezervasyonlar"
      >
        <View style={{ gap: spacing.sm }}>
          {recentReservations.map((reservation) => (
            <CompactDataCard
              key={reservation.title}
              icon="clock"
              title={reservation.title}
              meta={reservation.meta}
              status={reservation.status}
            />
          ))}
        </View>
      </ProfileSection>

      <ProfileSection
        icon="ticket"
        isOpen={openSection === "coupons"}
        onToggle={() => toggleSection("coupons")}
        summary={`${profileCoupons.length} özel kupon`}
        title="Kuponlar"
      >
        <View style={{ gap: spacing.sm }}>
          {profileCoupons.map((coupon) => (
            <CouponCard key={coupon.title} {...coupon} />
          ))}
        </View>
      </ProfileSection>

      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => {
          selectionImpact();
          router.push("/favorites");
        }}
        pressScale={0.97}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xl,
          borderWidth: 1,
          flexDirection: "row",
          gap: spacing.md,
          minHeight: 62,
          opacity: pressed ? 0.9 : 1,
          paddingHorizontal: spacing.lg,
          ...shadows.soft
        })}
      >
        <View style={{
          alignItems: "center",
          backgroundColor: colors.brandSoft,
          borderRadius: radii.pill,
          height: 38,
          justifyContent: "center",
          width: 38
        }}>
          <Icon name="heart" color={colors.brand} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.label, color: colors.ink }}>Favoriler</Text>
          <Text style={{ ...typography.small, color: colors.muted }}>Favori sayfasına yönlendirir</Text>
        </View>
        <Icon name="chevron" color={colors.muted} size={16} />
      </AnimatedPressable>

      <SupportLinksSection compact />

      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => {
          selectionImpact();
          onLogout();
        }}
        pressScale={0.97}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.brandSoft,
          borderColor: colors.borderStrong,
          borderRadius: radii.lg,
          borderWidth: 1,
          flexDirection: "row",
          gap: spacing.sm,
          justifyContent: "center",
          minHeight: 50,
          opacity: pressed ? 0.9 : 1
        })}
      >
        <Icon name="arrowLeft" color={colors.brand} size={18} />
        <Text style={{ ...typography.button, color: colors.brand }}>Çıkış yap</Text>
      </AnimatedPressable>
    </View>
  );
}

function ProfilePhotoButton({
  initials,
  uri,
  isBusy,
  isDarkMode,
  onPress
}: {
  initials: string;
  uri?: string;
  isBusy: boolean;
  isDarkMode: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      accessibilityLabel="Profil fotoğrafını değiştir"
      accessibilityRole="button"
      disabled={isBusy}
      onPress={onPress}
      pressScale={0.94}
      style={({ pressed }) => ({
        alignItems: "center",
        height: 102,
        justifyContent: "center",
        opacity: isBusy ? 0.76 : pressed ? 0.9 : 1,
        width: 102
      })}
    >
      <View style={{
        alignItems: "center",
        backgroundColor: uri ? colors.surface : colors.brand,
        borderColor: isDarkMode ? colors.brand : "rgba(255,255,255,0.82)",
        borderRadius: radii.pill,
        borderWidth: 4,
        height: 94,
        justifyContent: "center",
        overflow: "hidden",
        width: 94,
        ...shadows.lifted
      }}>
        {uri ? (
          <Image source={{ uri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
        ) : (
          <Text style={{ ...typography.title, color: colors.onBrand, fontSize: 26, lineHeight: 32 }}>
            {initials}
          </Text>
        )}
      </View>
      <View style={{
        alignItems: "center",
        backgroundColor: isDarkMode ? colors.brand : colors.surface,
        borderColor: isDarkMode ? colors.surfaceRaised : colors.ink,
        borderRadius: radii.pill,
        borderWidth: 3,
        bottom: 4,
        height: 32,
        justifyContent: "center",
        position: "absolute",
        right: 3,
        width: 32
      }}>
        {isBusy ? (
          <ActivityIndicator color={isDarkMode ? colors.onBrand : colors.brand} size="small" />
        ) : (
          <Icon
            name="plus"
            color={isDarkMode ? colors.onBrand : colors.brand}
            size={16}
            strokeWidth={2.8}
          />
        )}
      </View>
    </AnimatedPressable>
  );
}

function ProfileSection({
  title,
  icon,
  summary,
  isOpen,
  onToggle,
  children
}: {
  title: string;
  icon: IconName;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.xl,
      borderWidth: 1,
      overflow: "hidden",
      ...shadows.soft
    }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        pressScale={0.985}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: pressed ? colors.brandSoft : colors.surface,
          flexDirection: "row",
          gap: spacing.sm,
          minHeight: 68,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md
        })}
      >
        <View style={{
          alignItems: "center",
          backgroundColor: colors.brandSoft,
          borderRadius: radii.pill,
          height: 34,
          justifyContent: "center",
          width: 34
        }}>
          <Icon name={icon} color={colors.brand} size={17} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ ...typography.cardTitle, color: colors.ink }}>{title}</Text>
          <Text style={{ ...typography.small, color: colors.muted }}>{summary}</Text>
        </View>
        <View style={{
          alignItems: "center",
          backgroundColor: isOpen ? colors.brand : colors.backgroundAlt,
          borderColor: isOpen ? colors.brand : colors.border,
          borderRadius: radii.pill,
          borderWidth: 1,
          height: 32,
          justifyContent: "center",
          transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
          width: 32
        }}>
          <Icon name="chevronDown" color={isOpen ? colors.onBrand : colors.muted} size={16} strokeWidth={2.4} />
        </View>
      </AnimatedPressable>
      {isOpen ? (
        <View style={{
          borderTopColor: colors.border,
          borderTopWidth: 1,
          padding: spacing.md
        }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function EditableInfoRow({
  label,
  value,
  isEditing,
  multiline = false,
  onChangeText,
  onDone,
  onEdit
}: {
  label: string;
  value: string;
  isEditing: boolean;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onDone: () => void;
  onEdit: () => void;
}) {
  if (isEditing) {
    return (
      <View style={{
        backgroundColor: colors.backgroundAlt,
        borderColor: colors.borderStrong,
        borderRadius: radii.lg,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}>
        <Text style={{ ...typography.small, color: colors.brand }}>{label}</Text>
        <TextInput
          accessibilityLabel={`${label} düzenle`}
          autoFocus
          cursorColor={colors.brand}
          multiline={multiline}
          onChangeText={onChangeText}
          onSubmitEditing={multiline ? undefined : onDone}
          placeholder={label}
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          selectionColor={colors.brandSoft}
          style={[
            {
              ...typography.body,
              color: colors.ink,
              minHeight: multiline ? 78 : 38,
              paddingVertical: spacing.xs,
              textAlignVertical: multiline ? "top" : "center"
            },
            { outlineColor: "transparent", outlineStyle: "none", outlineWidth: 0 } as never
          ]}
          value={value}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            selectionImpact();
            onDone();
          }}
          style={({ pressed }) => ({
            alignItems: "center",
            alignSelf: "flex-end",
            backgroundColor: colors.brand,
            borderRadius: radii.pill,
            minHeight: 34,
            justifyContent: "center",
            opacity: pressed ? 0.88 : 1,
            paddingHorizontal: spacing.lg
          })}
        >
          <Text style={{ ...typography.small, color: colors.onBrand }}>Kaydet</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} düzenle`}
      onPress={onEdit}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.brandSoft : colors.backgroundAlt,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 64,
        opacity: pressed ? 0.92 : 1,
        padding: spacing.md
      })}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={{ ...typography.small, color: colors.muted }}>{label}</Text>
        <Text numberOfLines={multiline ? 2 : 1} style={{ ...typography.body, color: colors.ink }}>
          {value}
        </Text>
      </View>
      <View style={{
        alignItems: "center",
        alignSelf: "center",
        backgroundColor: colors.brandSoft,
        borderRadius: radii.pill,
        justifyContent: "center",
        minHeight: 28,
        paddingHorizontal: spacing.sm
      }}>
        <Text style={{ ...typography.tab, color: colors.brand }}>Düzenle</Text>
      </View>
    </Pressable>
  );
}

function EmptyAddressState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={{
      alignItems: "center",
      backgroundColor: colors.backgroundAlt,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.brandSoft,
        borderRadius: radii.pill,
        height: 44,
        justifyContent: "center",
        width: 44
      }}>
        <Icon name="mapPin" color={colors.brand} size={20} />
      </View>
      <Text style={{ ...typography.label, color: colors.ink }}>Kayıtlı adres yok</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.brand,
          borderRadius: radii.pill,
          minHeight: 36,
          justifyContent: "center",
          opacity: pressed ? 0.88 : 1,
          paddingHorizontal: spacing.lg
        })}
      >
        <Text style={{ ...typography.small, color: colors.onBrand }}>İlk adresi ekle</Text>
      </Pressable>
    </View>
  );
}

function EditableAddressCard({
  address,
  draft,
  isEditing,
  onCancel,
  onDelete,
  onDraftChange,
  onEdit,
  onSave
}: {
  address: AddressItem;
  draft: AddressDraft;
  isEditing: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onDraftChange: (draft: Partial<AddressDraft>) => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  if (isEditing) {
    return (
      <View style={{
        backgroundColor: colors.backgroundAlt,
        borderColor: colors.borderStrong,
        borderRadius: radii.lg,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md
      }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <View style={{
            alignItems: "center",
            backgroundColor: colors.brandSoft,
            borderRadius: radii.pill,
            height: 34,
            justifyContent: "center",
            width: 34
          }}>
            <Icon name="mapPin" color={colors.brand} size={17} />
          </View>
          <Text style={{ ...typography.label, color: colors.ink, flex: 1 }}>Adresi düzenle</Text>
        </View>

        <AddressTextInput
          label="Adres adı"
          onChangeText={(value) => onDraftChange({ label: value })}
          placeholder="Ev, iş, yazlık..."
          value={draft.label}
        />
        <AddressTextInput
          label="Adres detayı"
          multiline
          onChangeText={(value) => onDraftChange({ value })}
          placeholder="Mahalle, cadde, apartman, ilçe..."
          value={draft.value}
        />

        <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: pressed ? colors.border : colors.surface,
              borderColor: colors.border,
              borderRadius: radii.pill,
              borderWidth: 1,
              minHeight: 32,
              justifyContent: "center",
              paddingHorizontal: spacing.lg
            })}
          >
            <Text style={{ ...typography.small, color: colors.mutedStrong }}>Vazgeç</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onSave}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: colors.brand,
              borderRadius: radii.pill,
              minHeight: 32,
              justifyContent: "center",
              opacity: pressed ? 0.88 : 1,
              paddingHorizontal: spacing.lg
            })}
          >
            <Text style={{ ...typography.small, color: colors.onBrand }}>Kaydet</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{
      alignItems: "center",
      backgroundColor: colors.backgroundAlt,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 74,
      padding: spacing.md
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.brandSoft,
        borderRadius: radii.pill,
        height: 40,
        justifyContent: "center",
        width: 40
      }}>
        <Icon name="mapPin" color={colors.brand} size={19} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${address.label} adresini düzenle`}
        onPress={onEdit}
        style={({ pressed }) => ({
          flex: 1,
          gap: spacing.xs,
          opacity: pressed ? 0.78 : 1
        })}
      >
        <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink }}>
          {address.label}
        </Text>
        <Text numberOfLines={2} style={{ ...typography.small, color: colors.muted }}>
          {address.value}
        </Text>
      </Pressable>
      <View style={{ gap: spacing.xs }}>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: colors.brandSoft,
            borderRadius: radii.pill,
            minHeight: 28,
            justifyContent: "center",
            opacity: pressed ? 0.84 : 1,
            paddingHorizontal: spacing.sm
          })}
        >
          <Text style={{ ...typography.tab, color: colors.brand }}>Düzenle</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: pressed ? "rgba(220,38,38,0.16)" : "rgba(220,38,38,0.08)",
            borderRadius: radii.pill,
            minHeight: 28,
            justifyContent: "center",
            paddingHorizontal: spacing.sm
          })}
        >
          <Text style={{ ...typography.tab, color: colors.danger }}>Sil</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddressTextInput({
  label,
  value,
  placeholder,
  multiline = false,
  onChangeText
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs
    }}>
      <Text style={{ ...typography.small, color: colors.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        cursorColor={colors.brand}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.disabledText}
        returnKeyType="done"
        selectionColor={colors.brandSoft}
        style={[
          {
            ...typography.body,
            color: colors.ink,
            minHeight: multiline ? 52 : 30,
            paddingVertical: 0,
            textAlignVertical: multiline ? "top" : "center"
          },
          { outlineColor: "transparent", outlineStyle: "none", outlineWidth: 0 } as never
        ]}
        value={value}
      />
    </View>
  );
}

function CompactDataCard({
  icon,
  title,
  meta,
  status
}: {
  icon: IconName;
  title: string;
  meta: string;
  status?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => selectionImpact()}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: colors.backgroundAlt,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        minHeight: 66,
        opacity: pressed ? 0.9 : 1,
        padding: spacing.md
      })}
    >
      <View style={{
        alignItems: "center",
        backgroundColor: colors.brandSoft,
        borderRadius: radii.pill,
        height: 40,
        justifyContent: "center",
        width: 40
      }}>
        <Icon name={icon} color={colors.brand} size={19} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>
          {meta}
        </Text>
      </View>
      {status ? (
        <View style={{
          backgroundColor: colors.brandSoft,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs
        }}>
          <Text style={{ ...typography.tab, color: colors.brand }}>{status}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function CouponCard({
  title,
  value,
  detail
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <View style={{
      alignItems: "center",
      backgroundColor: colors.brandSoft,
      borderColor: colors.borderStrong,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      minHeight: 72,
      padding: spacing.md
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.brand,
        borderRadius: radii.pill,
        height: 44,
        justifyContent: "center",
        width: 44
      }}>
        <Text style={{ ...typography.label, color: colors.onBrand }}>{value}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={{ ...typography.label, color: colors.ink }}>{title}</Text>
        <Text style={{ ...typography.small, color: colors.muted }}>{detail}</Text>
      </View>
    </View>
  );
}

function SupportLinksSection({ compact = false }: { compact?: boolean }) {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.xl,
      borderWidth: 1,
      marginHorizontal: compact ? 0 : spacing.screen,
      overflow: "hidden",
      ...shadows.soft
    }}>
      {links.map((link, index) => (
        <AnimatedPressable
          accessibilityRole="button"
          key={link.label}
          onPress={selectionImpact}
          pressScale={0.985}
          style={{
            alignItems: "center",
            borderBottomColor: colors.border,
            borderBottomWidth: index === links.length - 1 ? 0 : 1,
            flexDirection: "row",
            gap: spacing.md,
            minHeight: compact ? 52 : 56,
            paddingHorizontal: spacing.lg
          }}
        >
          <Icon name={link.icon} color={colors.muted} size={18} />
          <Text style={{ ...typography.body, color: colors.ink, flex: 1 }}>{link.label}</Text>
          <Icon name="chevron" color={colors.muted} size={16} />
        </AnimatedPressable>
      ))}
    </View>
  );
}

function ThemeModeFloatingButton({
  currentMode,
  top
}: {
  currentMode: ThemeMode;
  top: number;
}) {
  const { setMode } = useThemeMode();
  const isDarkMode = currentMode === "dark";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDarkMode ? "Gece modu aktif" : "Gündüz modu aktif"}
      onPress={() => {
        selectionImpact();
        setMode(isDarkMode ? "light" : "dark");
      }}
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed ? 0.84 : 1,
        position: "absolute",
        right: spacing.screen,
        top,
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
    </Pressable>
  );
}

function ThemeOrbGraphic({ isDarkMode }: { isDarkMode: boolean }) {
  const sky = isDarkMode ? "#000000" : "#EE0650";
  const wave = isDarkMode ? "#FBE2A0" : "#FFE8F0";
  const ground = isDarkMode ? "#07120F" : "#FFD9E6";
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
        <Path
          d="M1.2 29.5 C9 27.5 14.5 25.8 21 27.2 C27 28.5 31 32.4 37 30.3 C40.8 29 44.5 28.7 46.8 29.5 L46.8 46.8 L1.2 46.8 Z"
          fill={wave}
          opacity={isDarkMode ? 0.78 : 0.9}
        />
        <Path
          d="M1.2 33.2 C10 31.7 16 32.5 23 34.5 C30 36.5 37.5 35.5 46.8 32.7 L46.8 46.8 L1.2 46.8 Z"
          fill={ground}
          opacity={0.96}
        />
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
