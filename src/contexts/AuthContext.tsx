import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authApi, tokenStorage, type ApiUser } from "../lib/api";
import { SiweMessage } from "siwe";

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
  walletLogin: (address: string, signMessage: (msg: string) => Promise<string>) => Promise<void>;
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

  const walletLogin = useCallback(async (address: string, signMessage: (msg: string) => Promise<string>) => {
    // 1. Get nonce from backend (creates user if new)
    const { nonce } = await authApi.getNonce(address);

    // 2. Create SIWE message
    const domain = window.location.host;
    const origin = window.location.origin;
    const siweMessage = new SiweMessage({
      domain,
      address,
      statement: "Sign in to SocialFi with your Ethereum wallet",
      uri: origin,
      version: "1",
      chainId: 11155111, // Sepolia
      nonce,
    });
    const messageStr = siweMessage.prepareMessage();

    // 3. Sign with wallet
    const signature = await signMessage(messageStr);

    // 4. Verify on backend → get JWT
    const { token: newToken, user: newUser } = await authApi.verifySiwe({
      message: messageStr,
      signature,
    });

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
        walletLogin,
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
