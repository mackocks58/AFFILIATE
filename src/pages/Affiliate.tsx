import { useState, useEffect } from "react";
import { ref, get, set, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";

export default function Affiliate() {
  const { user } = useAuth();
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  
  const [level1, setLevel1] = useState<any[]>([]);
  const [level2, setLevel2] = useState<any[]>([]);
  const [level3, setLevel3] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    async function loadAffiliateData() {
      try {
        // 1. Get or create user's affiliate code
        const userRef = ref(db, `users/${user!.uid}`);
        const snap = await get(userRef);
        
        let code = "";
        if (snap.exists() && snap.val().affiliateCode) {
          code = snap.val().affiliateCode;
        } else {
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
          await set(ref(db, `users/${user!.uid}/affiliateCode`), code);
        }
        setAffiliateCode(code);

        // Fetch All Users once and build the tree locally to avoid index errors!
        const allUsersSnap = await get(ref(db, "users"));
        const allUsers: any[] = [];
        if (allUsersSnap.exists()) {
          allUsersSnap.forEach(child => {
            allUsers.push({ uid: child.key, ...child.val() });
          });
        }

        // Level 1
        const l1 = allUsers.filter(u => u.referredBy === code);
        const l1Codes = l1.map(u => u.affiliateCode).filter(Boolean);

        // Level 2
        const l2 = allUsers.filter(u => l1Codes.includes(u.referredBy));
        const l2Codes = l2.map(u => u.affiliateCode).filter(Boolean);

        // Level 3
        const l3 = allUsers.filter(u => l2Codes.includes(u.referredBy));

        l1.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        l2.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        l3.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

        setLevel1(l1);
        setLevel2(l2);
        setLevel3(l3);
      } catch (e) {
        console.error("Error loading affiliate data", e);
      } finally {
        setLoading(false);
      }
    }

    loadAffiliateData();
  }, [user]);

  const copyLink = () => {
    if (!affiliateCode) return;
    const link = `${window.location.origin}/register?ref=${affiliateCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareWhatsApp = () => {
    if (!affiliateCode) return;
    const link = `${window.location.origin}/register?ref=${affiliateCode}`;
    const text = encodeURIComponent(`Join EAGLE STAR using my referral code *${affiliateCode}* and get premium picks! ${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!user) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: 60 }}>
          <h2 style={{ color: "var(--accent)" }}>Please log in</h2>
          <p className="muted">You must be logged in to access the affiliate program.</p>
        </div>
      </Shell>
    );
  }

  const activeList = activeTab === 1 ? level1 : activeTab === 2 ? level2 : level3;

  return (
    <Shell>
      <div style={{ marginBottom: 32, textAlign: "center", position: "relative" }}>
        <div className="breathe" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 200, height: 100, background: "radial-gradient(ellipse, rgba(56, 189, 248, 0.25) 0%, transparent 70%)", zIndex: -1 }}></div>
        
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(to right, #050816, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          <span className="breathe" style={{ display: "inline-block", color: "#38bdf8" }}>✨</span> Affiliate Program
        </h1>
        <p className="muted" style={{ margin: "0 0 16px 0" }}>Invite your friends to EAGLE STAR and earn multi-level commissions!</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>Loading your network...</div>
      ) : (
        <div className="grid" style={{ gap: 24 }}>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 16 }}>
            <div className="card" style={{ background: "linear-gradient(135deg, rgba(161, 98, 7, 0.2), rgba(5, 8, 22, 0.9))", border: "1px solid rgba(56, 189, 248, 0.3)", padding: 20, textAlign: "center", borderRadius: 20 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", opacity: 0.8 }}>Level 1</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#38bdf8", textShadow: "0 0 20px rgba(56,189,248,0.5)" }}>{level1.length}</div>
            </div>
            <div className="card" style={{ background: "linear-gradient(135deg, rgba(161, 98, 7, 0.2), rgba(5, 8, 22, 0.9))", border: "1px solid rgba(16, 185, 129, 0.3)", padding: 20, textAlign: "center", borderRadius: 20 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", opacity: 0.8 }}>Level 2</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#10b981", textShadow: "0 0 20px rgba(16,185,129,0.5)" }}>{level2.length}</div>
            </div>
            <div className="card" style={{ background: "linear-gradient(135deg, rgba(161, 98, 7, 0.2), rgba(5, 8, 22, 0.9))", border: "1px solid rgba(139, 92, 246, 0.3)", padding: 20, textAlign: "center", borderRadius: 20 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)", opacity: 0.8 }}>Level 3</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#8b5cf6", textShadow: "0 0 20px rgba(139,92,246,0.5)" }}>{level3.length}</div>
            </div>
          </div>

          {/* Share Section */}
          <div className="card" style={{ padding: 24, border: "1px solid rgba(56, 189, 248, 0.4)", position: "relative", overflow: "hidden", borderRadius: 20 }}>
            <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 60%)", borderRadius: "50%" }}></div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 20, color: "var(--text)" }}>Your Unique Link</h3>
            <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>Share this link! When someone registers, they'll be added to your Level 1 network.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 12, padding: "12px", overflowX: "auto" }}>
                <span className="mono" style={{ color: "#38bdf8", fontSize: 15, fontWeight: "bold", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                  {window.location.origin}/register?ref={affiliateCode}
                </span>
              </div>
              
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="btn" onClick={copyLink} style={{ flex: 1, background: "rgba(56,189,248,0.15)", borderColor: "rgba(56,189,248,0.5)", color: "#38bdf8", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 }}>
                  {copied ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Copy Link
                    </>
                  )}
                </button>
                <button className="btn" onClick={shareWhatsApp} style={{ flex: 1, background: "rgba(37,211,102,0.15)", borderColor: "rgba(37,211,102,0.5)", color: "#25D366", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  WhatsApp
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: 24, padding: "16px 20px", background: "rgba(56,189,248,0.05)", borderRadius: 12, border: "1px solid rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Your Code:</span> 
              <span className="mono" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>{affiliateCode}</span>
            </div>
          </div>

          {/* Referral List Tabs */}
          <div className="card" style={{ padding: 24, borderRadius: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 16 }}>
              <button 
                className={`btn ${activeTab === 1 ? "" : "btn-ghost"}`} 
                onClick={() => setActiveTab(1)}
                style={{ flex: 1, padding: "10px 0" }}
              >
                Level 1 ({level1.length})
              </button>
              <button 
                className={`btn ${activeTab === 2 ? "" : "btn-ghost"}`} 
                onClick={() => setActiveTab(2)}
                style={{ flex: 1, padding: "10px 0" }}
              >
                Level 2 ({level2.length})
              </button>
              <button 
                className={`btn ${activeTab === 3 ? "" : "btn-ghost"}`} 
                onClick={() => setActiveTab(3)}
                style={{ flex: 1, padding: "10px 0" }}
              >
                Level 3 ({level3.length})
              </button>
            </div>
            
            {activeList.length === 0 ? (
              <div className="alert" style={{ textAlign: "center", background: "rgba(255,255,255,0.02)", borderColor: "var(--stroke)", color: "var(--muted)" }}>
                No referrals found in Level {activeTab}.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ minWidth: 400 }}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Registered On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeList.map((r, i) => (
                      <tr key={r.uid || i}>
                        <td style={{ fontWeight: 600 }}>{r.displayName || "Unknown User"}</td>
                        <td className="muted">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}</td>
                        <td>
                          {r.status === "active" ? (
                             <span style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: "bold" }}>Active</span>
                          ) : (
                             <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: "bold" }}>Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}





