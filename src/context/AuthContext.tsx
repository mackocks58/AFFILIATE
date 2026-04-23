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
  refreshClaims: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any | null>(null);

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
    };
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin, userData, refreshClaims, logout }),
    [user, loading, isAdmin, userData, refreshClaims, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
