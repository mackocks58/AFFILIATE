import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/firebase";

function linkCls({ isActive }: { isActive: boolean }) {
  return isActive ? "dock-item active" : "dock-item";
}

export function BottomNav() {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const r = ref(db, `userUnread/${user.uid}`);
    return onValue(r, (snap) => {
      let total = 0;
      snap.forEach(c => {
        total += c.val();
      });
      setTotalUnread(total);
    });
  }, [user]);

  return (
    <div className="bottom-dock-container">
      <nav className="bottom-dock">
        <NavLink to="/" className={linkCls} end>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Home</span>
        </NavLink>
        
        {user && (
          <>
            <NavLink to="/chat" className={linkCls} style={{ position: "relative" }}>
              {totalUnread > 0 && (
                <div style={{ position: "absolute", top: 4, right: "calc(50% - 16px)", background: "var(--danger)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 5px", borderRadius: 10 }}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </div>
              )}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <span>Chat</span>
            </NavLink>
            <NavLink to="/payments" className={linkCls}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              <span>Wallet</span>
            </NavLink>
            <NavLink to="/betslips" className={linkCls}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Betslips</span>
            </NavLink>
            <NavLink to="/account" className={linkCls}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Profile</span>
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}
