import { useState, useEffect } from "react";
import { Shell } from "@/components/Shell";
import { ref, get } from "firebase/database";
import { db } from "@/firebase";

export default function WeeklyChallenge() {
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferrals() {
      try {
        const usersSnap = await get(ref(db, "users"));
        const refsSnap = await get(ref(db, "referrals"));
        if (!usersSnap.exists() || !refsSnap.exists()) return;

        const usersData = usersSnap.val();
        const refsData = refsSnap.val();

        const ranks = [];

        // Loop through all referral codes to aggregate counts
        for (const [code, refs] of Object.entries(refsData)) {
          const codeStr = String(code);
          const refUsers = refs as Record<string, any>;
          let totalCount = 0;
          let activeCount = 0;

          for (const uid of Object.keys(refUsers)) {
            totalCount++;
            if (usersData[uid] && usersData[uid].status === "active") {
              activeCount++;
            }
          }

          // Find the user who owns this affiliate code
          const ownerEntry = Object.entries(usersData).find(([_, u]: any) => u.affiliateCode === codeStr);
          if (ownerEntry) {
            const rawName = (ownerEntry[1] as any).displayName || (ownerEntry[1] as any).email?.split("@")[0] || "User";
            ranks.push({
              uid: ownerEntry[0],
              name: rawName.split(" ")[0], // Extract first name like Account.tsx
              totalCount,
              activeCount
            });
          }
        }

        ranks.sort((a, b) => b.activeCount - a.activeCount || b.totalCount - a.totalCount);
        setTopReferrers(ranks.slice(0, 10));
      } catch (err) {
        console.error("Error fetching leaderboard", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReferrals();
  }, []);

  const getRankIcon = (index: number) => {
    if (index === 0) return <i className="fa-solid fa-crown" style={{ color: "#facc15", fontSize: 28, filter: "drop-shadow(0 0 12px rgba(250, 204, 21, 0.6))" }}></i>;
    if (index === 1) return <i className="fa-solid fa-medal" style={{ color: "#94a3b8", fontSize: 24, filter: "drop-shadow(0 0 8px rgba(148, 163, 184, 0.4))" }}></i>;
    if (index === 2) return <i className="fa-solid fa-medal" style={{ color: "#b45309", fontSize: 24, filter: "drop-shadow(0 0 8px rgba(180, 83, 9, 0.4))" }}></i>;
    return <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--stroke)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{index + 1}</div>;
  };

  return (
    <Shell>
      <div style={{ marginBottom: 32, textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: -50, left: "50%", transform: "translateX(-50%)", width: 150, height: 150, background: "rgba(250, 204, 21, 0.2)", filter: "blur(60px)", borderRadius: "50%", zIndex: 0 }}></div>
        <h1 className="page-title" style={{ position: "relative", zIndex: 1, color: "var(--accent)", textShadow: "0 0 20px rgba(250, 204, 21, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <i className="fa-solid fa-trophy"></i>
          Weekly Challenge
        </h1>
        <p className="muted" style={{ position: "relative", zIndex: 1, marginTop: 8 }}>Top 10 Affiliates of the Week</p>
      </div>

      <div className="card" style={{ background: "linear-gradient(135deg, rgba(5, 8, 22, 0.95), rgba(11, 18, 36, 0.95))", border: "1px solid rgba(250, 204, 21, 0.3)", overflow: "hidden", boxShadow: "0 10px 40px rgba(250, 204, 21, 0.1)" }}>
        {loading ? (
          <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
            <svg width="40" height="40" viewBox="0 0 50 50" style={{ margin: "0 auto 16px" }}>
              <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent)" strokeWidth="4" strokeDasharray="31.4 31.4" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
            <p className="muted">Loading leaderboard...</p>
          </div>
        ) : topReferrers.length === 0 ? (
          <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
            <p className="muted">No referrals this week yet. Start inviting to claim the top spot!</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="weekly-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--stroke)", background: "rgba(5, 8, 22, 0.4)" }}>
                  <th style={{ padding: "16px 20px", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", width: 80, textAlign: "center" }}>Rank</th>
                  <th style={{ padding: "16px 20px", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>Referrer Name</th>
                  <th style={{ padding: "16px 20px", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Referrals</th>
                  <th style={{ padding: "16px 20px", color: "var(--muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Active Status</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((user, i) => (
                  <tr key={user.uid} style={{ 
                    borderBottom: i < topReferrers.length - 1 ? "1px solid var(--stroke)" : "none",
                    background: i === 0 ? "linear-gradient(90deg, rgba(250, 204, 21, 0.15), transparent)" : "transparent",
                    position: "relative"
                  }}>
                    <td data-label="Rank" style={{ padding: "20px", textAlign: "center", position: "relative" }}>
                      {i === 0 && <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "var(--accent)", boxShadow: "0 0 15px var(--accent)" }}></div>}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {getRankIcon(i)}
                      </div>
                    </td>
                    <td data-label="Referrer Name" style={{ padding: "20px" }}>
                      <div style={{ fontWeight: 800, fontSize: i === 0 ? 18 : 16, color: i === 0 ? "var(--accent)" : "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                        {user.name}
                        {i === 0 && <span style={{ fontSize: 10, background: "rgba(250,204,21,0.2)", color: "var(--accent)", padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(250,204,21,0.5)", whiteSpace: "nowrap" }}>#1 CHAMPION</span>}
                      </div>
                    </td>
                    <td data-label="Total Referrals" style={{ padding: "20px", color: "var(--muted)", fontWeight: 500, fontSize: 15 }}>
                      <i className="fa-solid fa-users" style={{ marginRight: 6 }}></i> {user.totalCount}
                    </td>
                    <td data-label="Active Status" style={{ padding: "20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", padding: "6px 12px", borderRadius: 16 }}>
                        <div className="breathe" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }}></div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#10b981", whiteSpace: "nowrap" }}>{user.activeCount} Active</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
