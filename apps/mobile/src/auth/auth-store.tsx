import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { uploadAccountAvatar, type AccountAvatarAsset } from "../api/account";
import {
  fetchCustomerAccount,
  saveCustomerProfile,
  type CustomerAccount,
  type CustomerAddressInput,
  type CustomerProfileUpdate
} from "../api/customer";
import {
  authorizeWithLogto,
  completePendingWebAuthSession,
  refreshLogtoSession,
  revokeLogtoSession,
  type DirectSignIn
} from "./logto-client";
import { createLogoutMarkerStorage } from "./logout-marker-storage";
import { createSessionController } from "./session-controller";
import { createSessionStorage } from "./secure-session-storage";
import type { SessionStatus } from "./session-state";

export { isTokenExpired, parseStoredSession, reduceSession, shouldRefresh } from "./session-state";

export interface CustomerSession {
  status: SessionStatus;
  accessToken: string | null;
  customer: CustomerAccount | null;
  error: string | null;
  signIn(directSignIn?: DirectSignIn): Promise<void>;
  signUp(): Promise<void>;
  signOut(): Promise<void>;
  refreshCustomer(): Promise<void>;
  saveAddress(address: CustomerAddressInput): Promise<boolean>;
  saveProfile(update: CustomerProfileUpdate): Promise<boolean>;
  updateAvatar(asset: AccountAvatarAsset): Promise<boolean>;
}

const CustomerSessionContext = createContext<CustomerSession | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(() => createSessionStorage(Platform.OS), []);
  const logoutMarker = useMemo(() => createLogoutMarkerStorage(), []);
  const controller = useMemo(() => createSessionController({
    authorize: authorizeWithLogto,
    fetchCustomer: fetchCustomerAccount,
    logoutMarker,
    refresh: refreshLogtoSession,
    revoke: revokeLogtoSession,
    storage
  }), [logoutMarker, storage]);
  const [state, setState] = useState(controller.getState());

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    completePendingWebAuthSession().catch(() => undefined);
    void controller.restore();
    return unsubscribe;
  }, [controller]);

  const saveProfile = useCallback(async (update: CustomerProfileUpdate) => {
    const result = await controller.runAuthenticated((accessToken) => saveCustomerProfile(accessToken, update));
    if (!result) return false;
    await controller.refreshCustomer();
    return controller.getState().customer !== null;
  }, [controller]);

  const saveAddress = useCallback(
    (address: CustomerAddressInput) => saveProfile({ addresses: [address] }),
    [saveProfile]
  );

  const updateAvatar = useCallback(async (asset: AccountAvatarAsset) => {
    const avatarUrl = await controller.runAuthenticated((accessToken) => uploadAccountAvatar(asset, accessToken));
    if (!avatarUrl) return false;
    const saved = await controller.runAuthenticated((accessToken) => saveCustomerProfile(accessToken, { avatarUrl }));
    if (!saved) return false;
    await controller.refreshCustomer();
    return controller.getState().customer !== null;
  }, [controller]);

  const value = useMemo<CustomerSession>(() => ({
    accessToken: state.accessToken,
    customer: state.customer,
    error: state.error,
    refreshCustomer: () => controller.refreshCustomer(),
    saveAddress,
    saveProfile,
    signIn: (directSignIn?: DirectSignIn) => controller.signIn(directSignIn),
    signOut: () => controller.signOut(),
    signUp: () => controller.signUp(),
    status: state.status,
    updateAvatar
  }), [controller, saveAddress, saveProfile, state, updateAvatar]);

  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSession(): CustomerSession {
  const session = useContext(CustomerSessionContext);
  if (!session) throw new Error("useCustomerSession must be used inside CustomerSessionProvider");
  return session;
}
