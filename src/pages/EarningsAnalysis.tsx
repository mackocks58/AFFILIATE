import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";

export default function EarningsAnalysis() {
  const { user, userData, exchangeRates } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0
  });
  const [graphData, setGraphData] = useState<{ month: string, amount: number }[]>([]);

  useEffect(() => {
    if (!user || !userData) return;

    async function loadData() {
      try {
        const country = userData.country || "Tanzania";
        const currency = country === "Zambia" ? "ZMW" : country === "Burundi" ? "BIF" : country === "Mozambique" ? "MZN" : country === "Congo" ? "CDF" : "TZS";
        const exchangeRate = exchangeRates[country] || 1;
        
        const rates = {
          video: 500 * exchangeRate,
          quiz: 300 * exchangeRate
        };

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon is 0, Sun is 6
        const startOfWeek = startOfToday - (dayOfWeek * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        let todayTotal = 0;
        let weekTotal = 0;
        let monthTotal = 0;
        let grandTotal = 0;

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentMonthMap: Record<number, number> = {};
        for (let i = 1; i <= daysInMonth; i++) {
          currentMonthMap[i] = 0;
        }

        const addAmount = (amount: number, timestamp: number) => {
          grandTotal += amount;
          if (timestamp >= startOfToday) todayTotal += amount;
          if (timestamp >= startOfWeek) weekTotal += amount;
          if (timestamp >= startOfMonth) {
            monthTotal += amount;
            const d = new Date(timestamp);
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
              currentMonthMap[d.getDate()] += amount;
            }
          }
        };

        // 1. Process Commissions
        const commSnap = await get(ref(db, `commissions/${user!.uid}`));
        if (commSnap.exists()) {
          const comms = Object.values(commSnap.val() as Record<string, any>);
          comms.forEach(c => {
            if (c.amount && c.createdAt) {
              addAmount(Number(c.amount), c.createdAt);
            }
          });
        }

        // 2. Process Videos (YouTube, TikTok, Facebook)
        const processVideos = (watchedObj: any) => {
          if (!watchedObj) return;
          Object.values(watchedObj).forEach((timestamp: any) => {
            if (typeof timestamp === 'number') {
              addAmount(rates.video, timestamp);
            }
          });
        };

        processVideos(userData.watchedYouTube);
        processVideos(userData.watchedTikTok);
        processVideos(userData.watchedFacebook);

        // 3. Process Quizzes (We only know lastQuizDate, so we roughly estimate based on today's quizEarnings)
        // Since we don't have historical quiz timestamps easily accessible, we just add the total quiz earnings into grand total
        // and if lastQuizDate is today/this week/this month we add a portion.
        // But for exactness, it's better to just include the total.
        const quizTotal = Number(userData.quizEarnings || 0);
        grandTotal += quizTotal;
        if (userData.lastQuizDate) {
           const lqd = new Date(userData.lastQuizDate).getTime();
           if (lqd >= startOfToday) todayTotal += quizTotal;
           else if (lqd >= startOfWeek) weekTotal += quizTotal;
           else if (lqd >= startOfMonth) monthTotal += quizTotal;
           
           const lqdDate = new Date(userData.lastQuizDate);
           if (lqdDate.getMonth() === now.getMonth() && lqdDate.getFullYear() === now.getFullYear()) {
             currentMonthMap[lqdDate.getDate()] += quizTotal;
           }
        }

        // Include welcome bonus to grand total and this month
        const welcomeBonus = Number(userData.welcomeBonus || 0);
        if (welcomeBonus > 0) {
           grandTotal += welcomeBonus;
           const joined = userData.createdAt || startOfToday; // fallback
           if (joined >= startOfToday) todayTotal += welcomeBonus;
           if (joined >= startOfWeek) weekTotal += welcomeBonus;
           if (joined >= startOfMonth) monthTotal += welcomeBonus;
           
           const joinedDate = new Date(joined);
           if (joinedDate.getMonth() === now.getMonth() && joinedDate.getFullYear() === now.getFullYear()) {
             currentMonthMap[joinedDate.getDate()] += welcomeBonus;
           }
        }

        setStats({ today: todayTotal, week: weekTotal, month: monthTotal, total: grandTotal });

        const chartData = Object.keys(currentMonthMap).map(k => ({ month: k, amount: currentMonthMap[Number(k)] }));
        setGraphData(chartData);

      } catch (err) {
        console.error("Failed to load earnings analysis", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, userData, exchangeRates]);

  if (!userData) {
    return <Shell><div className="alert">Loading analysis...</div></Shell>;
  }

  const currency = userData.country === "Zambia" ? "ZMW" : userData.country === "Burundi" ? "BIF" : userData.country === "Mozambique" ? "MZN" : userData.country === "Congo" ? "CDF" : "TZS";

  // SVG Line Chart Calculations
  const maxVal = Math.max(...graphData.map(d => d.amount), 1);
  const width = 1000;
  const height = 200;
  
  const points = graphData.map((d, i) => {
    const x = (i / (graphData.length - 1 || 1)) * width;
    const y = height - ((d.amount / maxVal) * height * 0.8) - 10; // leave top padding
    return { x, y, amount: d.amount, day: d.month };
  });

  const pathD = points.length > 0 ? "M " + points.map(p => `${p.x},${p.y}`).join(" L ") : "";
  const areaD = points.length > 0 ? pathD + ` L ${width},${height} L 0,${height} Z` : "";

  return (
    <Shell>
      <div style={{ marginBottom: 20, textAlign: "center", position: "relative" }}>
        <div className="breathe" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 200, height: 100, background: "radial-gradient(ellipse, rgba(16, 185, 129, 0.2) 0%, transparent 70%)", zIndex: -1 }}></div>
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(to right, #050816, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 4px 0", fontSize: 24 }}>
          <span className="breathe" style={{ display: "inline-block", color: "#10b981" }}>💰</span> Earnings Analysis
        </h1>
        <p className="muted" style={{ margin: "0 0 8px 0", fontSize: 13 }}>Track your income across all tasks and commissions.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>Loading earnings data...</div>
      ) : (
        <div className="grid" style={{ gap: 24 }}>
          
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {/* Today */}
            <div className="card" style={{ padding: 16, background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(56, 189, 248, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontSize: 14 }}>
                  <i className="fa-solid fa-calendar-day"></i>
                </div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7dd3fc", fontWeight: 700 }}>Today</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
                {stats.today.toLocaleString()} <span style={{ fontSize: 12, opacity: 0.5 }}>{currency}</span>
              </div>
            </div>

            {/* Week */}
            <div className="card" style={{ padding: 16, background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", fontSize: 14 }}>
                  <i className="fa-solid fa-calendar-week"></i>
                </div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6ee7b7", fontWeight: 700 }}>This Week</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
                {stats.week.toLocaleString()} <span style={{ fontSize: 12, opacity: 0.5 }}>{currency}</span>
              </div>
            </div>

            {/* Month */}
            <div className="card" style={{ padding: 16, background: "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", fontSize: 14 }}>
                  <i className="fa-solid fa-calendar-days"></i>
                </div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c4b5fd", fontWeight: 700 }}>This Month</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
                {stats.month.toLocaleString()} <span style={{ fontSize: 12, opacity: 0.5 }}>{currency}</span>
              </div>
            </div>

            {/* Total */}
            <div className="card" style={{ padding: 16, background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(245, 158, 11, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", fontSize: 14 }}>
                  <i className="fa-solid fa-sack-dollar"></i>
                </div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fcd34d", fontWeight: 700 }}>All-Time</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
                {stats.total.toLocaleString()} <span style={{ fontSize: 12, opacity: 0.5 }}>{currency}</span>
              </div>
            </div>
          </div>

          {/* Graph Section */}
          <div className="card" style={{ padding: 32, borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: 18, color: "var(--text)", display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-chart-line" style={{ color: "#10b981" }}></i> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Earnings
            </h3>

            <div style={{ position: "relative", height: 250, paddingBottom: 20 }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
                <defs>
                   <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
                     <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                   </linearGradient>
                </defs>
                <path d={areaD} fill="url(#lineGrad)" />
                <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              {/* Render interactive dots over the SVG using absolute positioning so we can use HTML tooltips easily */}
              {points.map((p, i) => (
                <div key={i} className="tooltip-container" style={{
                  position: "absolute",
                  left: `calc(${(i / (points.length - 1 || 1)) * 100}% - 6px)`,
                  top: `calc(${(p.y / height) * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: "#10b981",
                  border: "2px solid #050816",
                  borderRadius: "50%",
                  cursor: "pointer",
                  zIndex: 10
                }}>
                  <div className="tooltip" style={{
                    position: "absolute", top: -35, left: "50%", transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.8)", padding: "4px 8px", borderRadius: 4, fontSize: 11,
                    color: "#fff", pointerEvents: "none", whiteSpace: "nowrap", opacity: 0, transition: "opacity 0.2s"
                  }}>
                    {p.day}: {p.amount.toLocaleString()} {currency}
                  </div>
                </div>
              ))}
            </div>

            {/* X-axis labels (first, middle, last days roughly) */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, color: "var(--muted)", fontSize: 11, fontWeight: 600 }}>
              <span>1st</span>
              <span>15th</span>
              <span>{points.length}th</span>
            </div>
            
            <style>{`
              .tooltip-container:hover .tooltip {
                opacity: 1 !important;
                z-index: 100;
              }
            `}</style>

          </div>
        </div>
      )}
    </Shell>
  );
}
