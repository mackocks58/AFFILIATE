import { useState, useEffect } from "react";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { ref, update, get } from "firebase/database";
import { db } from "@/firebase";

const VIDEOS = [
  { id: "7104231845942447403", title: "Funny Comedy Skit" },
  { id: "7092837485934548267", title: "Dance Challenge" },
  { id: "7112345678901234567", title: "Life Hacks" },
  { id: "7123456789012345678", title: "Viral Prank" }
];

export default function TikTokVideos() {
  const { user, userData, loading, exchangeRates } = useAuth();
  const [activeVideo, setActiveVideo] = useState<{id: string, title: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [busy, setBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [taskConfig, setTaskConfig] = useState<{ allowedDays: number[], baseReward: number } | null>(null);

  useEffect(() => {
    get(ref(db, "settings/tasks/tiktok")).then(snap => {
      if (snap.exists()) setTaskConfig(snap.val());
      else setTaskConfig({ allowedDays: [2], baseReward: 800 });
    });
  }, []);

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = new Date().getDay();
  const allowedDays = taskConfig?.allowedDays || [2];
  const isAvailable = allowedDays.includes(dayOfWeek);
  const currentDayName = DAYS[dayOfWeek];

  const country = userData?.country || "Tanzania";
  const currency = country === "Zambia" ? "ZMW" : country === "Burundi" ? "BIF" : country === "Mozambique" ? "MZN" : country === "Congo" ? "CDF" : "TZS";
  const rate = exchangeRates[country] || 1;
  const rewardAmount = Number(((taskConfig?.baseReward || 800) * rate).toFixed(2));
  
  const getDaysUntil = () => {
    if (allowedDays.length === 0) return -1;
    let minDiff = 7;
    for (const target of allowedDays) {
      let diff = target - dayOfWeek;
      if (diff <= 0) diff += 7;
      if (diff < minDiff) minDiff = diff;
    }
    return minDiff;
  };
  const daysRemaining = getDaysUntil();

  useEffect(() => {
    let timer: any;
    if (activeVideo && isPlaying && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [activeVideo, isPlaying, timeLeft]);

  useEffect(() => {
    const handleBlur = () => {
      if (document.activeElement?.tagName === 'IFRAME') {
        setIsPlaying(true);
      }
    };
    const handleFocus = () => {
      setIsPlaying(false);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const claimReward = async () => {
    if (!user || !activeVideo) return;
    setBusy(true);
    try {
      const dbRef = ref(db, `users/${user.uid}`);
      const snap = await get(dbRef);
      if (snap.exists()) {
        const data = snap.val();
        const watched = data.watchedTikTok || {};
        if (watched[activeVideo.id]) {
          throw new Error("You have already claimed this video.");
        }
        
        watched[activeVideo.id] = Date.now();
        const currentEarnings = Number(data.tiktokEarnings || 0);
        
        await update(dbRef, {
          watchedTikTok: watched,
          tiktokEarnings: currentEarnings + rewardAmount
        });
        
        setMessage({ type: "success", text: `Successfully earned ${rewardAmount} ${currency}!` });
        setActiveVideo(null);
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
      setActiveVideo(null);
    }
    setBusy(false);
  };

  // Auto-claim when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && activeVideo && !busy) {
      claimReward();
    }
  }, [timeLeft, activeVideo, busy]);

  const hasWatched = (id: string) => {
    return !!(userData?.watchedTikTok && userData.watchedTikTok[id]);
  };

  return (
    <Shell>
      {loading || !userData || !taskConfig ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 40, color: "var(--accent)" }}></i>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 32 }}>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-brands fa-tiktok" style={{ color: "#00f2fe" }}></i> TikTok Videos
            </h1>
            <p className="muted">Watch and engage with TikTok videos to earn {rewardAmount} {currency} per video.</p>
          </div>

          {message.text && (
            <div className="alert" style={{ marginBottom: 24, background: message.type === "success" ? "rgba(16,185,129,0.1)" : undefined, borderColor: message.type === "success" ? "var(--accent2)" : undefined, color: message.type === "success" ? "var(--accent2)" : undefined }}>
              {message.text}
            </div>
          )}

          {!isAvailable && (
            <div className="card" style={{ padding: 32, textAlign: "center", border: "1px solid rgba(0, 242, 254, 0.3)", background: "rgba(0,242,254,0.05)" }}>
              <i className="fa-brands fa-tiktok" style={{ fontSize: 48, color: "#00f2fe", marginBottom: 16 }}></i>
              <h2>Available on {allowedDays.map(d => DAYS[d]).join(", ")}</h2>
              <p className="muted" style={{ fontSize: 16 }}>Today is <strong>{currentDayName}</strong>.</p>
              <div style={{ marginTop: 16, display: "inline-block", background: "rgba(0,242,254,0.1)", padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(0,242,254,0.2)" }}>
                {daysRemaining > 0 ? (
                  <>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#00f2fe" }}>{daysRemaining}</span>
                    <span style={{ marginLeft: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, fontSize: 14 }}>Days Remaining</span>
                  </>
                ) : (
                   <span style={{ color: "#00f2fe", fontWeight: 700 }}>Task is not available right now.</span>
                )}
              </div>
            </div>
          )}

      {isAvailable && (
        <div className="grid">
          {VIDEOS.map((vid) => {
            const watched = hasWatched(vid.id);
            return (
              <div key={vid.id} className="card breathe" style={{ padding: 16, border: "1px solid rgba(0, 242, 254, 0.2)", background: "rgba(5, 8, 22, 0.6)", animationDuration: "6s" }}>
                <div style={{ width: "100%", height: 180, background: "#000", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <i className="fa-brands fa-tiktok" style={{ fontSize: 48, color: "#00f2fe", position: "absolute" }}></i>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{vid.title}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--accent2)", fontWeight: 700 }}>Earn {rewardAmount} {currency}</span>
                  {watched ? (
                    <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 14 }}><i className="fa-solid fa-check"></i> Watched</span>
                  ) : (
                    <button 
                      className="btn" 
                      style={{ background: "linear-gradient(135deg, #00f2fe, #4facfe)", color: "#111", border: "none", fontWeight: 700 }}
                      onClick={() => { setActiveVideo(vid); setTimeLeft(60); setMessage({type:"", text:""}); }}
                    >
                      Watch Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal */}
      {activeVideo && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.95)", zIndex: 99999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{activeVideo.title}</h3>
              <button onClick={() => setActiveVideo(null)} style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: 24, cursor: "pointer" }}>&times;</button>
            </div>
            
            <div style={{ width: "100%", height: 500, background: "#000", borderRadius: 12, overflow: "hidden" }}>
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.tiktok.com/embed/v2/${activeVideo.id}`} 
                title="TikTok video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>

            <div style={{ marginTop: 24, padding: 20, background: "rgba(255,255,255,0.05)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {timeLeft > 0 ? (
                <>
                  <div style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Time Remaining</div>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: isPlaying ? "#00f2fe" : "var(--muted)" }}>{timeLeft}s</div>
                  {isPlaying ? (
                     <p style={{ margin: "10px 0 0", fontSize: 13, color: "#10b981", fontWeight: 700 }}><i className="fa-solid fa-play"></i> Video is playing. Keep watching...</p>
                  ) : (
                     <p style={{ margin: "10px 0 0", fontSize: 13, color: "#ef4444", fontWeight: 700 }}><i className="fa-solid fa-pause"></i> Video paused. Click the video to resume countdown.</p>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, color: "var(--accent2)", fontWeight: 800, marginBottom: 12 }}>Task Complete!</div>
                  <div style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>
                    {busy ? "Crediting earnings automatically..." : "Earnings credited!"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </Shell>
  );
}
