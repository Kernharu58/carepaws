import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getErrorMessage } from "@/services/api";
import { getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from "@/services/tokenStore";
import type { AuthUser, UserRole } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the very first silent-refresh-on-load check is in flight — render a loading state, not the login form, during this. */
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ success: boolean; data: { user: AuthUser } }>("/api/auth/me");
    setUser(res.data.data.user);
  }, []);

  // On first load, there's no access token in memory (it's never
  // persisted — see tokenStore.ts) but there may be a refresh token in
  // sessionStorage from earlier in this tab's life. Silently exchange it
  // for a fresh access token rather than forcing a re-login on every
  // page refresh within the same tab.
  useEffect(() => {
    (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await api.post("/api/auth/refresh", { refreshToken });
        setAccessToken(res.data.data.accessToken);
        setRefreshToken(res.data.data.refreshToken);
        await refreshUser();
      } catch {
        clearTokens();
      } finally {
        setIsInitializing(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { accessToken, refreshToken, user: loggedInUser } = res.data.data;
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(loggedInUser);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      await api.post("/api/auth/logout", refreshToken ? { refreshToken } : {});
    } catch {
      // Logging out client-side still proceeds even if the server call fails.
    }
    clearTokens();
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: UserRole[]) => (user ? roles.includes(user.role) : false), [user]);

  return (
    <AuthContext.Provider
      value={{ user, isInitializing, isAuthenticated: Boolean(user), login, logout, refreshUser, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
