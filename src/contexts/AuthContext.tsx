import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authApi, tokenStorage, type ApiUser } from "../lib/api";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.get());
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if token exists, fetch current user
  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then(({ user }) => setUser(user))
        .catch(() => {
          tokenStorage.clear();
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: newToken, user: newUser } = await authApi.login({ email, password });
    tokenStorage.set(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const register = useCallback(async (data: Parameters<typeof authApi.register>[0]) => {
    const { token: newToken, user: newUser } = await authApi.register(data);
    tokenStorage.set(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const { user: updated } = await authApi.getMe();
    setUser(updated);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
