import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '@tikprofil/shared-api';
import type { User } from '@tikprofil/shared-types';
import { STORAGE_KEYS } from '@tikprofil/shared-constants';

const TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;
const REFRESH_TOKEN_KEY = STORAGE_KEYS.REFRESH_TOKEN;

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  authenticated: boolean;
}

class AuthService {
  private state: AuthState = {
    user: null,
    session: null,
    loading: true,
    authenticated: false,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  subscribe(callback: (state: AuthState) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((callback) => callback(this.state));
  }

  private async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }

  private async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  }

  private async deleteItem(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('[AuthService] Starting initialization...');
      this.state.loading = true;
      this.notify();

      const accessToken = await this.getItem(TOKEN_KEY);
      const refreshToken = await this.getItem(REFRESH_TOKEN_KEY);
      console.log('[AuthService] Tokens found:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

      if (accessToken && refreshToken) {
        console.log('[AuthService] Setting session with tokens...');
        let { data: { session }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        console.log('[AuthService] setSession result:', { hasSession: !!session, error: error?.message });

        // Token expired veya invalid ise refresh dene
        if ((error || !session) && refreshToken) {
          console.log('[AuthService] Session invalid, attempting token refresh...');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
              refresh_token: refreshToken,
            });

            if (!refreshError && refreshData.session) {
              console.log('[AuthService] Token refreshed successfully');
              session = refreshData.session;
              // Yeni token'ları kaydet
              await this.setItem(TOKEN_KEY, refreshData.session.access_token);
              await this.setItem(REFRESH_TOKEN_KEY, refreshData.session.refresh_token);
              error = null;
            } else {
              console.log('[AuthService] Token refresh failed:', refreshError?.message);
            }
          } catch (refreshErr) {
            console.error('[AuthService] Token refresh error:', refreshErr);
          }
        }

        if (!error && session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name,
            avatar: session.user.user_metadata?.avatar_url,
            createdAt: session.user.created_at,
          };

          console.log('[AuthService] User authenticated:', user.email);
          this.state = {
            user,
            session,
            loading: false,
            authenticated: true,
          };
        } else {
          console.log('[AuthService] Session invalid, clearing tokens');
          await this.clearTokens();
          this.state = {
            user: null,
            session: null,
            loading: false,
            authenticated: false,
          };
        }
      } else {
        console.log('[AuthService] No tokens found, user not authenticated');
        this.state = {
          user: null,
          session: null,
          loading: false,
          authenticated: false,
        };
      }
    } catch (error) {
      console.error('[AuthService] Initialize error:', error);
      await this.clearTokens();
      this.state = {
        user: null,
        session: null,
        loading: false,
        authenticated: false,
      };
    } finally {
      this.notify();
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        await this.setItem(TOKEN_KEY, data.session.access_token);
        await this.setItem(REFRESH_TOKEN_KEY, data.session.refresh_token);

        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          fullName: data.user.user_metadata?.full_name,
          avatar: data.user.user_metadata?.avatar_url,
          createdAt: data.user.created_at,
        };

        this.state = {
          user,
          session: data.session,
          loading: false,
          authenticated: true,
        };

        this.notify();
      }
    } catch (error) {
      console.error('[AuthService] Sign in error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string, fullName?: string): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        await this.setItem(TOKEN_KEY, data.session.access_token);
        await this.setItem(REFRESH_TOKEN_KEY, data.session.refresh_token);

        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          fullName: data.user.user_metadata?.full_name,
          avatar: data.user.user_metadata?.avatar_url,
          createdAt: data.user.created_at,
        };

        this.state = {
          user,
          session: data.session,
          loading: false,
          authenticated: true,
        };

        this.notify();
      }
    } catch (error) {
      console.error('[AuthService] Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      await this.clearTokens();

      this.state = {
        user: null,
        session: null,
        loading: false,
        authenticated: false,
      };

      this.notify();
    } catch (error) {
      console.error('[AuthService] Sign out error:', error);
      throw error;
    }
  }

  private async clearTokens(): Promise<void> {
    await this.deleteItem(TOKEN_KEY);
    await this.deleteItem(REFRESH_TOKEN_KEY);
  }

  getState(): AuthState {
    return { ...this.state };
  }

  isAuthenticated(): boolean {
    return this.state.authenticated;
  }

  getUser(): User | null {
    return this.state.user;
  }

  getSession(): any | null {
    return this.state.session;
  }
}

export const authService = new AuthService();
