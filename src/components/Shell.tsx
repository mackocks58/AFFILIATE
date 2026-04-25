import { useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/context/AuthContext";

export function Shell({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="shell">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998 }} 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div style={{ position: "fixed", top: 0, left: sidebarOpen ? 0 : -300, width: 280, height: "100%", background: "linear-gradient(180deg, #111b33, #050816)", zIndex: 9999, transition: "left 0.3s ease", borderRight: "1px solid var(--stroke)", padding: 24, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <span className="brand-text-eaglestar" style={{ fontSize: 24 }}>EAGLE STAR</span>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text)", cursor: "pointer" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16 }}>
            <div style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>Main Menu</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Link to="/" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-home" style={{ width: 30, color: "var(--accent)" }}></i> Dashboard</Link>
              <Link to="/bind-account" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-link" style={{ width: 30, color: "var(--accent2)" }}></i> Bind Account</Link>
              <Link to="/withdraw" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-money-bill-wave" style={{ width: 30, color: "var(--danger)" }}></i> Withdraw</Link>
              <Link to="/affiliate" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-users" style={{ width: 30, color: "#38bdf8" }}></i> Affiliate</Link>
              <Link to="/weekly-challenge" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-trophy" style={{ width: 30, color: "var(--accent)" }}></i> Weekly Challenge</Link>
              <Link to="/bundle" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><span style={{ display: "inline-block", width: 30, fontSize: 18 }}>🎁</span> Promotions</Link>
              <Link to="/account" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-user" style={{ width: 30, color: "var(--muted)" }}></i> My Profile</Link>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16 }}>
            <div style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>Tasks Section</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Link to="/tasks/youtube" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-brands fa-youtube" style={{ width: 30, color: "#ff0000" }}></i> YouTube Videos</Link>
              <Link to="/tasks/tiktok" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-brands fa-tiktok" style={{ width: 30, color: "#00f2fe" }}></i> TikTok Videos</Link>
              <Link to="/tasks/facebook" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-brands fa-facebook" style={{ width: 30, color: "#1877f2" }}></i> Facebook Videos</Link>
              <Link to="/quiz" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-clipboard-question" style={{ width: 30, color: "#10b981" }}></i> Weekly Quiz</Link>
            </div>
          </div>

          <div style={{ marginBottom: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 16 }}>
            <div style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>Assets Section</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Link to="/team-analysis" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-network-wired" style={{ width: 30, color: "#a855f7" }}></i> Team Analysis</Link>
              <Link to="/earnings-analysis" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}><i className="fa-solid fa-chart-line" style={{ width: 30, color: "#10b981" }}></i> Earnings Analysis</Link>
            </div>
          </div>
        </div>

        {user && (
          <div style={{ marginTop: "auto" }}>
            <button className="btn btn-danger" style={{ width: "100%", padding: 12 }} onClick={() => { setSidebarOpen(false); logout(); nav("/login"); }}>Sign out</button>
          </div>
        )}
      </div>

      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "transparent", border: "none", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
             <Navbar />
          </div>
        </div>
      )}
      

      {children}
      {user && <BottomNav />}
    </div>
  );
}


