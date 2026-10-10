import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  apiLogin,
  apiRegister,
  saveSession,
  clearSession,
  getStoredUser,
  type AuthUser,
  type RegisterPayload,
} from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  const login = useCallback(async (username: string, password: string) => {
    const resp = await apiLogin(username, password);
    saveSession(resp.access_token, resp.user);
    setUser(resp.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    // Register then immediately log in
    await apiRegister(payload);
    const resp = await apiLogin(payload.username, payload.password);
    saveSession(resp.access_token, resp.user);
    setUser(resp.user);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
