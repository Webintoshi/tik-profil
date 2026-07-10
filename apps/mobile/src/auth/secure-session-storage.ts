interface SecureStoreLike {
  deleteItemAsync(key: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}

const SESSION_KEY = "tikprofil.customer.oidc-session.v1";

export function createSessionStorage(
  platform: string,
  loadSecureStore: () => Promise<SecureStoreLike> = () => import("expo-secure-store")
) {
  const isNative = platform === "android" || platform === "ios";
  return {
    async clear(): Promise<void> {
      if (!isNative) return;
      const secureStore = await loadSecureStore();
      await secureStore.deleteItemAsync(SESSION_KEY);
    },
    async read(): Promise<string | null> {
      if (!isNative) return null;
      const secureStore = await loadSecureStore();
      return secureStore.getItemAsync(SESSION_KEY);
    },
    async write(value: string): Promise<void> {
      if (!isNative) return;
      const secureStore = await loadSecureStore();
      await secureStore.setItemAsync(SESSION_KEY, value);
    }
  };
}
