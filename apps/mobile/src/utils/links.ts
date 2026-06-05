import { Linking } from "react-native";

export async function openExternalUrl(url?: string): Promise<void> {
  if (!url) {
    return;
  }

  await Linking.openURL(url);
}

export async function openPhone(phone?: string): Promise<void> {
  if (!phone) {
    return;
  }

  const normalized = phone.replace(/[^\d+]/g, "");
  await Linking.openURL(`tel:${normalized}`);
}

export async function openWhatsApp(phone?: string): Promise<void> {
  if (!phone) {
    return;
  }

  const normalized = phone.replace(/[^\d]/g, "");
  await Linking.openURL(`https://wa.me/${normalized}`);
}
