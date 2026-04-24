import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import type { AppNotification } from "@/types";

function linkCls({ isActive }: { isActive: boolean }) {
  return isActive ? "active" : undefined;
}

export function Navbar() {
  const { user, userData, loading, isAdmin, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    
    let notifications: AppNotification[] = [];
    let reads: Record<string, boolean> = {};

    const updateCount = () => {
      const count = notifications.filter(n => n.id && !reads[n.id]).length;
      setUnreadCount(count);
    };

    const notifRef = ref(db, "notifications");
    const unsubNotifs = onValue(notifRef, (snap) => {
      const data = snap.val() as Record<string, AppNotification> | null;
      if (data) {
        notifications = Object.entries(data).map(([id, val]) => ({ ...val, id }));
      } else {
        notifications = [];
      }
      updateCount();
    });

    const readsRef = ref(db, `userReads/${user.uid}`);
    const unsubReads = onValue(readsRef, (snap) => {
      reads = snap.val() || {};
      updateCount();
    });

    return () => {
      unsubNotifs();
      unsubReads();
    };
  }, [user]);

  return (
    <nav className="nav">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden />
        <span className="brand-text-eaglestar">EAGLE STAR</span>
      </Link>
      <div className="nav-links">

        {user && isAdmin && (
          <NavLink to="/admin" className={linkCls}>
            Admin
          </NavLink>
        )}
        {!loading && !user && (
          <>
            <NavLink to="/login" className={linkCls}>
              Log in
            </NavLink>
            <NavLink to="/register" className={linkCls}>
              Register
            </NavLink>
          </>
        )}
        {user && (
          <div className="row" style={{ alignItems: "center", gap: 16 }}>
            {userData?.country && (
               <img 
                 src={`https://flagcdn.com/w40/${userData.country === "Zambia" ? "zm" : userData.country === "Burundi" ? "bi" : userData.country === "Mozambique" ? "mz" : userData.country === "Congo" ? "cd" : "tz"}.png`} 
                 alt={userData.country} 
                 title={userData.country}
                 style={{ width: 24, height: 'auto', borderRadius: 2 }}
               />
            )}
            <Link to="/notifications" style={{ position: "relative", display: "flex", alignItems: "center", color: "var(--text)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  background: "var(--danger)",
                  color: "var(--text)",
                  fontSize: 10,
                  fontWeight: "bold",
                  borderRadius: "10px",
                  padding: "2px 6px",
                  minWidth: 18,
                  textAlign: "center"
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

          </div>
        )}
      </div>
    </nav>
  );
}

