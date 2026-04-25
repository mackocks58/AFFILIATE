import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";

export default function TeamAnalysis() {
  const { user, userData, exchangeRates } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState({ total: 0, l1: 0, l2: 0, l3: 0 });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !userData?.affiliateCode) return;
    
    async function loadData() {
      try {
        // 1. Fetch Commissions
        const commSnap = await get(ref(db, `commissions/${user!.uid}`));
        let t = 0, l1 = 0, l2 = 0, l3 = 0;
        if (commSnap.exists()) {
          const comms = Object.values(commSnap.val() as Record<string, any>);
          comms.forEach(c => {
            const amt = Number(c.amount || 0);
            t += amt;
            if (c.level === 1) l1 += amt;
            else if (c.level === 2) l2 += amt;
            else if (c.level === 3) l3 += amt;
          });
        }
        setCommissions({ total: t, l1, l2, l3 });

        // 2. Fetch Team Members
        const code = userData.affiliateCode;
        const allUsersSnap = await get(ref(db, "users"));
        const allUsers: any[] = [];
        if (allUsersSnap.exists()) {
          allUsersSnap.forEach(child => {
            allUsers.push({ uid: child.key, ...child.val() });
          });
        }

        const level1 = allUsers.filter(u => u.referredBy === code);
        const l1Codes = level1.map(u => u.affiliateCode).filter(Boolean);

        const level2 = allUsers.filter(u => l1Codes.includes(u.referredBy));
        const l2Codes = level2.map(u => u.affiliateCode).filter(Boolean);

        const level3 = allUsers.filter(u => l2Codes.includes(u.referredBy));

        const allTeam = [
          ...level1.map(u => ({ ...u, level: 1 })),
          ...level2.map(u => ({ ...u, level: 2 })),
          ...level3.map(u => ({ ...u, level: 3 }))
        ];

        allTeam.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTeamMembers(allTeam);

      } catch (err) {
        console.error("Failed to load team data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, userData]);

  if (!userData) {
    return <Shell><div className="alert">Loading analysis...</div></Shell>;
  }

  const currency = userData.country === "Zambia" ? "ZMW" : userData.country === "Burundi" ? "BIF" : userData.country === "Mozambique" ? "MZN" : userData.country === "Congo" ? "CDF" : "TZS";

  return (
    <Shell>
      <div style={{ marginBottom: 32, textAlign: "center", position: "relative" }}>
        <div className="breathe" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 200, height: 100, background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.2) 0%, transparent 70%)", zIndex: -1 }}></div>
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(to right, #050816, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          <span className="breathe" style={{ display: "inline-block", color: "#a855f7" }}>📊</span> Team Analysis
        </h1>
        <p className="muted" style={{ margin: "0 0 16px 0" }}>Detailed breakdown of your network and commissions.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>Loading team data...</div>
      ) : (
        <div className="grid" style={{ gap: 32 }}>
          {/* Main Commission Box */}
          <div className="card" style={{ 
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(5, 8, 22, 0.95))", 
            border: "1px solid rgba(139, 92, 246, 0.4)", 
            borderRadius: 24, 
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(139, 92, 246, 0.15)"
          }}>
            {/* Upper Portion */}
            <div style={{ padding: "20px 20px", textAlign: "center", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "radial-gradient(circle at top, rgba(139, 92, 246, 0.15), transparent 70%)", zIndex: 0 }}></div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c4b5fd", fontWeight: 800, marginBottom: 8 }}>Total Commission Earnings</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "var(--text)", textShadow: "0 4px 20px rgba(139, 92, 246, 0.4)" }}>
                  {commissions.total.toLocaleString()} <span style={{ fontSize: 16, opacity: 0.7 }}>{currency}</span>
                </div>
              </div>
            </div>
            
            <div style={{ height: 1, width: "100%", background: "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)" }}></div>
            
            {/* Lower Portion (3 splits) */}
            <div style={{ display: "flex", flexWrap: "wrap", background: "rgba(0,0,0,0.3)" }}>
              <div style={{ flex: "1 1 33%", padding: "16px 12px", textAlign: "center", borderRight: "1px solid rgba(139, 92, 246, 0.15)" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a78bfa", marginBottom: 6, fontWeight: 700 }}>Direct (Level 1)</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{commissions.l1.toLocaleString()} <span style={{ fontSize: 11, opacity: 0.5 }}>{currency}</span></div>
              </div>
              <div style={{ flex: "1 1 33%", padding: "16px 12px", textAlign: "center", borderRight: "1px solid rgba(139, 92, 246, 0.15)" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a78bfa", marginBottom: 6, fontWeight: 700 }}>Level 2</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{commissions.l2.toLocaleString()} <span style={{ fontSize: 11, opacity: 0.5 }}>{currency}</span></div>
              </div>
              <div style={{ flex: "1 1 33%", padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a78bfa", marginBottom: 6, fontWeight: 700 }}>Level 3</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{commissions.l3.toLocaleString()} <span style={{ fontSize: 11, opacity: 0.5 }}>{currency}</span></div>
              </div>
            </div>
          </div>

          {/* Team Members Table */}
          <div className="card" style={{ padding: 24, borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 18, color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-users" style={{ color: "#a855f7" }}></i> Team Members ({teamMembers.length})
            </h3>
            
            {teamMembers.length === 0 ? (
              <div className="alert" style={{ textAlign: "center", background: "rgba(255,255,255,0.02)", borderColor: "var(--stroke)", color: "var(--muted)" }}>
                You don't have any team members yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "16px 12px", borderBottom: "2px solid rgba(255,255,255,0.1)", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>User</th>
                      <th style={{ padding: "16px 12px", borderBottom: "2px solid rgba(255,255,255,0.1)", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>Level</th>
                      <th style={{ padding: "16px 12px", borderBottom: "2px solid rgba(255,255,255,0.1)", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>Deposited</th>
                      <th style={{ padding: "16px 12px", borderBottom: "2px solid rgba(255,255,255,0.1)", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((r, i) => (
                      <tr key={r.uid || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "16px 12px", fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(168, 85, 247, 0.2)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                            {r.displayName ? r.displayName.charAt(0).toUpperCase() : (r.username ? r.username.charAt(0).toUpperCase() : "U")}
                          </div>
                          <div>
                            <div style={{ color: "var(--text)" }}>{r.displayName || r.username || "Unknown"}</div>
                            {r.country && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
                                <img 
                                  src={`https://flagcdn.com/w20/${r.country === "Zambia" ? "zm" : r.country === "Burundi" ? "bi" : r.country === "Mozambique" ? "mz" : r.country === "Congo" ? "cd" : "tz"}.png`} 
                                  alt={r.country} 
                                  title={r.country}
                                  style={{ width: 14, height: 'auto', borderRadius: 2 }}
                                />
                                {r.country}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px 12px", color: "var(--muted)", fontWeight: 600 }}>Lvl {r.level}</td>
                        <td style={{ padding: "16px 12px", color: "var(--text)", fontWeight: 600 }}>
                          {r.status === "active" ? (
                            `${Math.round(500 * (exchangeRates[r.country || "Tanzania"] || 1))} ${r.country === "Zambia" ? "ZMW" : r.country === "Burundi" ? "BIF" : r.country === "Mozambique" ? "MZN" : r.country === "Congo" ? "CDF" : "TZS"}`
                          ) : (
                            `0 ${r.country === "Zambia" ? "ZMW" : r.country === "Burundi" ? "BIF" : r.country === "Mozambique" ? "MZN" : r.country === "Congo" ? "CDF" : "TZS"}`
                          )}
                        </td>
                        <td style={{ padding: "16px 12px" }}>
                          {r.status === "active" ? (
                             <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                               <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></span> Active
                             </span>
                          ) : (
                             <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                               <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }}></span> Inactive
                             </span>
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
