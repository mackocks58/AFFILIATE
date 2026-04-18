import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  time: string;
  league: string;
  status: string;
  createdAt: number;
};

export default function Home() {
  const [rows, setRows] = useState<Record<string, Match> | null>(null);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const query = (params.get("q") || "").toLowerCase();

  useEffect(() => {
    const r = ref(db, "matches");
    return onValue(r, (snap) => {
      setRows(snap.val() as Record<string, Match> | null);
      setLoading(false);
    });
  }, []);

  const matches = useMemo(() => {
    if (!rows) return [];
    let items = Object.entries(rows).map(([id, v]) => ({ ...v, id }));
    
    if (query) {
      items = items.filter(
        (m) => m.homeTeam.toLowerCase().includes(query) || m.awayTeam.toLowerCase().includes(query) || m.league.toLowerCase().includes(query)
      );
    }
    
    return items.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [rows, query]);

  return (
    <Shell>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span className="breathe" style={{ display: "inline-block", color: "var(--accent)" }}>⚽</span> Today's Popular Matches
        </h1>
        <p className="muted" style={{ margin: 0 }}>Top tier football action happening today.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>Loading live matches...</div>
      ) : matches.length === 0 ? (
        <div className="alert" style={{ textAlign: "center" }}>No matches found. Admins will update the daily matches soon!</div>
      ) : (
        <div className="grid cols-2" style={{ gap: 20 }}>
          {matches.map((m) => (
            <div key={m.id} className="card" style={{ background: "linear-gradient(135deg, rgba(11, 18, 36, 0.9), rgba(5, 8, 22, 0.95))", border: "1px solid var(--stroke)", transition: "transform 0.3s ease, box-shadow 0.3s ease", cursor: "pointer" }}
                 onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(16, 185, 129, 0.2)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                 onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--shadow)"; e.currentTarget.style.borderColor = "var(--stroke)"; }}>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                
                <div style={{ position: "absolute", top: 12, left: 16, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {m.league}
                </div>
                <div style={{ position: "absolute", top: 12, right: 16 }}>
                  {m.status.includes("Live") ? (
                    <span className="breathe" style={{ background: "rgba(251, 113, 133, 0.2)", color: "var(--danger)", padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>{m.status}</span>
                  ) : (
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent)", padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{m.time}</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: 32, marginBottom: 16 }}>
                  {/* Home Team */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", marginBottom: 12 }}>
                      <img src={m.homeLogo} alt={m.homeTeam} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontWeight: 700, textAlign: "center", fontSize: 14 }}>{m.homeTeam}</span>
                  </div>

                  {/* VS */}
                  <div style={{ flex: "0 0 50px", textAlign: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 20, color: "var(--muted)", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: 12 }}>VS</span>
                  </div>

                  {/* Away Team */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", marginBottom: 12 }}>
                      <img src={m.awayLogo} alt={m.awayTeam} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontWeight: 700, textAlign: "center", fontSize: 14 }}>{m.awayTeam}</span>
                  </div>
                </div>

                <button className="btn" style={{ width: "100%", padding: "10px", fontWeight: 600 }}>View Odds & Premium Tips</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
