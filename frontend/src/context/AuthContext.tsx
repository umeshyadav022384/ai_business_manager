import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  BUSINESS_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from "../api/client";
import {
  getMe,
  login as loginRequest,
  register as registerRequest,
} from "../api/auth";
import type {
  BusinessDto,
  MembershipDto,
  RegisterPayload,
  UserDto,
} from "../api/auth";

interface AuthContextValue {
  user: UserDto | null;
  memberships: MembershipDto[];
  currentBusiness: BusinessDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;

}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [memberships, setMemberships] = useState<MembershipDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Phase 2 always creates exactly one business per user at
  // registration, so "current business" is simply the first
  // membership. Once staff/multi-business support ships, this becomes
  // a real selector instead of an assumption.
  const currentBusiness = memberships.length > 0 ? memberships[0].business : null;

  async function loadCurrentUser() {
    try {
      const me = await getMe();
      setUser(me.user);
      setMemberships(me.memberships);
      if (me.memberships.length > 0) {
        localStorage.setItem(BUSINESS_STORAGE_KEY, me.memberships[0].business.id);
      }
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(BUSINESS_STORAGE_KEY);
      setUser(null);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      loadCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function refreshUser() {
    await loadCurrentUser();
  }
  async function login(email: string, password: string) {
    const result = await loginRequest(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.access_token);
    await loadCurrentUser();
  }

  async function register(payload: RegisterPayload) {
    const result = await registerRequest(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.access_token);
    localStorage.setItem(BUSINESS_STORAGE_KEY, result.business.id);
    setUser(result.user);
    setMemberships([{ business: result.business, role: "owner" }]);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(BUSINESS_STORAGE_KEY);
    setUser(null);
    setMemberships([]);
  }

  const value: AuthContextValue = {
    user,
    memberships,
    currentBusiness,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}