import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { auth, db } from "@/firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userData: any | null;
  exchangeRates: Record<string, number>;
  refreshClaims: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  const refreshClaims = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) {
      setIsAdmin(false);
      return;
    }
    const token = await u.getIdTokenResult(true);
    setIsAdmin(Boolean(token.claims.admin));
  }, []);

  useEffect(() => {
    let unsubDb: (() => void) | undefined;
    let unsubRates: (() => void) | undefined;
    
    // Always listen to exchange rates globally
    const ratesRef = ref(db, "settings/exchangeRates");
    unsubRates = onValue(ratesRef, (snap) => {
      if (snap.exists()) {
        setExchangeRates(snap.val());
      } else {
        // Fallback default rates if DB is empty
        setExchangeRates({
          Tanzania: 1,
          Zambia: 0.0105,
          Burundi: 1.15,
          Mozambique: 0.02666,
          Congo: 1
        });
      }
    });

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdTokenResult(true);
        setIsAdmin(Boolean(token.claims.admin));
        
        const userRef = ref(db, `users/${u.uid}`);
        unsubDb = onValue(userRef, (snap) => {
          setUserData(snap.val());
        });
      } else {
        setIsAdmin(false);
        setUserData(null);
        if (unsubDb) unsubDb();
      }
      setLoading(false);
    });
    
    return () => {
      unsubAuth();
      if (unsubDb) unsubDb();
      if (unsubRates) unsubRates();
    };
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin, userData, exchangeRates, refreshClaims, logout }),
    [user, loading, isAdmin, userData, exchangeRates, refreshClaims, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
