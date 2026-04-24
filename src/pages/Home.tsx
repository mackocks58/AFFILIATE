import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";
import { ref, get } from "firebase/database";
import { db } from "@/firebase";

export default function Home() {
  const { user, userData } = useAuth();
  const [activeReferrals, setActiveReferrals] = useState(0);
  const [showMessage, setShowMessage] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (!user || !userData?.affiliateCode) return;
    async function checkReferrals() {
      const refsSnap = await get(ref(db, `referrals/${userData.affiliateCode}`));
      if (refsSnap.exists()) {
        const refs = refsSnap.val();
        let count = 0;
        for (const uid of Object.keys(refs)) {
          const uSnap = await get(ref(db, `users/${uid}`));
          if (uSnap.exists() && uSnap.val().status === "active") {
            count++;
          }
        }
        setActiveReferrals(count);
      }
    }
    checkReferrals();
  }, [user, userData]);

  if (!user || !userData) {
    return <Shell><div className="alert">Loading dashboard...</div></Shell>;
  }

  const currency = userData.country === "Zambia" ? "ZMW" : userData.country === "Burundi" ? "BIF" : userData.country === "Mozambique" ? "MZN" : userData.country === "Congo" ? "CDF" : "TZS";
  const balance = Number(userData.balance || 0).toLocaleString();
  const deposited = Number(userData.deposited || 0).toLocaleString();
  const withdrawn = Number(userData.totalWithdrawn || 0).toLocaleString();
  const bonus = Number(userData.bonus || 0).toLocaleString();

  const ytEarnings = Number(userData.youtubeEarnings || 0);
  const ttEarnings = Number(userData.tiktokEarnings || 0);
  const fbEarnings = Number(userData.facebookEarnings || 0);
  const totalEarningsVal = Number(userData.balance || 0) + ytEarnings + ttEarnings + fbEarnings;
  const totalEarnings = totalEarningsVal.toLocaleString();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    if (hour < 22) return "Good evening";
    return "Good night";
  };

  const firstName = (userData.displayName || user.email?.split("@")[0] || "User").split(" ")[0];

  return (
    <Shell>
      <div style={{ marginBottom: 32, padding: "16px 0", textAlign: "center" }}>
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10, margin: "0 0 8px 0" }}>
          {getGreeting()}, <span style={{ color: "var(--accent)" }}>{firstName}</span> <span className="wave" style={{ display: "inline-block", transformOrigin: "70% 70%" }}>👋</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>Welcome to your dashboard!</p>
      </div>

      <div className="grid" style={{ gap: 24 }}>
        {/* Main Balance Card */}
        <div className="card" style={{ 
          background: "linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(5, 8, 22, 0.95))", 
          border: "2px solid rgba(250, 204, 21, 0.3)", 
          padding: "20px 20px", 
          textAlign: "center", 
          borderRadius: 24, 
          boxShadow: "0 12px 40px rgba(250, 204, 21, 0.15), inset 0 0 30px rgba(250, 204, 21, 0.1)", 
          width: "100%",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Animated Glow Orbs */}
          <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, background: "rgba(250, 204, 21, 0.25)", filter: "blur(50px)", borderRadius: "50%", animation: "pulse-glow 4s infinite" }}></div>
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 200, height: 200, background: "rgba(234, 179, 8, 0.2)", filter: "blur(50px)", borderRadius: "50%", animation: "pulse-glow 6s infinite reverse" }}></div>
          
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.15em", color: "#eab308", fontWeight: 800, marginBottom: 4 }}>Available Balance</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span>{showBalance ? balance : "****"}</span>
              <span style={{ fontSize: 18, opacity: 0.6, fontWeight: 700 }}>{currency}</span>
              <button onClick={() => setShowBalance(!showBalance)} style={{ background: "transparent", border: "none", color: "var(--text)", opacity: 0.6, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", marginLeft: 8 }}>
                <i className={`fa-solid ${showBalance ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 16, justifyContent: "center" }}>
              <Link to="/withdraw" className="btn breathe" style={{ padding: "12px 32px", fontSize: 15, borderRadius: 999, background: "linear-gradient(135deg, #facc15, #eab308)", color: "#0f172a", border: "none", boxShadow: "0 8px 24px rgba(250, 204, 21, 0.4)", fontWeight: 800 }}>Withdraw Funds</Link>
            </div>
          </div>
        </div>

        {/* Two smaller cards in one row */}
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <div className="card breathe" style={{ flex: 1, background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(239, 68, 68, 0.5)", padding: 20, textAlign: "center", borderRadius: 20, boxShadow: "0 0 30px rgba(239, 68, 68, 0.15)" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#ef4444", marginBottom: 4 }}>Total Withdrawn</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{withdrawn} <span style={{ fontSize: 14, opacity: 0.7 }}>{currency}</span></div>
          </div>

          <div className="card breathe" style={{ flex: 1, background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(16, 185, 129, 0.5)", padding: 20, textAlign: "center", borderRadius: 20, boxShadow: "0 0 30px rgba(16, 185, 129, 0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#10b981", marginBottom: 4 }}>Registration Bonus</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{bonus} <span style={{ fontSize: 14, opacity: 0.7 }}>{currency}</span></div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
              {activeReferrals >= 30 ? <span style={{ color: "var(--accent)" }}>Unlocked!</span> : `Need ${30 - activeReferrals} more active referrals to withdraw.`}
            </div>
          </div>
        </div>

        {/* Admin Message Section */}
        {showMessage && (
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
            <div style={{ fontSize: 24, color: "#10b981" }}>📢</div>
            <p style={{ margin: 0, color: "#10b981", fontSize: 14, fontWeight: 500, lineHeight: 1.5, flex: 1, paddingRight: 24 }}>
              Welcome to EAGLE STAR. Make sure to invite your friends and earn up to 30% bonus. Keep enjoying our premium services!
            </p>
            <button onClick={() => setShowMessage(false)} style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "#10b981", fontSize: 16, cursor: "pointer", opacity: 0.7 }}>✕</button>
          </div>
        )}

        {/* Video Earnings Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <div className="card breathe" style={{ background: "#ffffff", padding: 24, borderRadius: 24, boxShadow: "0 15px 35px rgba(37, 99, 235, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(37, 99, 235, 0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", fontSize: 24, boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8)" }}>
                <i className="fa-solid fa-wallet"></i>
              </div>
              <div>
                <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3b82f6", marginBottom: 4, fontWeight: 700 }}>Total Earnings</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{totalEarnings} <span style={{ fontSize: 16, opacity: 0.7, fontWeight: 700, color: "#475569" }}>{currency}</span></div>
              </div>
            </div>
          </div>

          <div className="card breathe" style={{ animationDelay: "0.2s", background: "linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(255, 0, 0, 0.5)", padding: 20, borderRadius: 20, boxShadow: "0 0 30px rgba(255, 0, 0, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255, 0, 0, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff0000", fontSize: 24 }}>
                <i className="fa-brands fa-youtube"></i>
              </div>
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#ff0000", marginBottom: 4 }}>YouTube Earnings</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{ytEarnings.toLocaleString()} <span style={{ fontSize: 14, opacity: 0.7 }}>{currency}</span></div>
              </div>
            </div>
          </div>

          <div className="card breathe" style={{ animationDelay: "0.4s", background: "linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(0, 242, 254, 0.5)", padding: 20, borderRadius: 20, boxShadow: "0 0 30px rgba(0, 242, 254, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0, 242, 254, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00f2fe", fontSize: 24 }}>
                <i className="fa-brands fa-tiktok"></i>
              </div>
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#00f2fe", marginBottom: 4 }}>TikTok Earnings</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{ttEarnings.toLocaleString()} <span style={{ fontSize: 14, opacity: 0.7 }}>{currency}</span></div>
              </div>
            </div>
          </div>

          <div className="card breathe" style={{ animationDelay: "0.6s", background: "linear-gradient(135deg, rgba(24, 119, 242, 0.2), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(24, 119, 242, 0.5)", padding: 20, borderRadius: 20, boxShadow: "0 0 30px rgba(24, 119, 242, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(24, 119, 242, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1877f2", fontSize: 24 }}>
                <i className="fa-brands fa-facebook"></i>
              </div>
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#1877f2", marginBottom: 4 }}>Facebook Earnings</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{fbEarnings.toLocaleString()} <span style={{ fontSize: 14, opacity: 0.7 }}>{currency}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Movies Section */}
        <div style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🎬</span> Action Movies (Premium)
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: "hidden", position: "relative", border: "1px solid rgba(56, 189, 248, 0.2)", boxShadow: "0 8px 24px rgba(0,0,0,0.05)" }}>
                <img src={`/movies/action_movie_${(i % 3) + 1}.png`} alt={`Action Movie ${i + 1}`} style={{ width: "100%", height: "auto", aspectRatio: "2/3", objectFit: "cover" }} />
                <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(5, 8, 22, 0.9)", padding: "4px 8px", borderRadius: 6, fontSize: 10, color: "var(--danger)", fontWeight: "900", border: "1px solid rgba(251, 113, 133, 0.3)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>LOCKED</div>
              </div>
            ))}
          </div>
        </div>


      </div>
    </Shell>
  );
}





