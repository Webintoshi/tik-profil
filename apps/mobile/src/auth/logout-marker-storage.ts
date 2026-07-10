interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

const LOGOUT_MARKER_KEY = "tikprofil.customer.logout-marker.v1";
const SIGNED_OUT = "signed_out";

export function createLogoutMarkerStorage(
  loadAsyncStorage: () => Promise<AsyncStorageLike> = async () =>
    (await import("@react-native-async-storage/async-storage")).default
) {
  return {
    async clear(): Promise<void> {
      const storage = await loadAsyncStorage();
      await storage.removeItem(LOGOUT_MARKER_KEY);
    },
    async read(): Promise<boolean> {
      const storage = await loadAsyncStorage();
      return await storage.getItem(LOGOUT_MARKER_KEY) === SIGNED_OUT;
    },
    async write(): Promise<void> {
      const storage = await loadAsyncStorage();
      await storage.setItem(LOGOUT_MARKER_KEY, SIGNED_OUT);
    }
  };
}
