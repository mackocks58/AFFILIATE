import { useState, useEffect } from "react";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { ref, update, get } from "firebase/database";
import { db } from "@/firebase";

const VIDEOS = [
  { id: "M7FIvfx5J10", title: "Nature Documentary Part 1" },
  { id: "LXb3EKWsInQ", title: "Stunning 4K Landscapes" },
  { id: "aqz-KE-bpKQ", title: "Amazing Tech Gadgets" },
  { id: "9bZkp7q19f0", title: "Top 10 Fastest Cars" }
];

export default function YouTubeVideos() {
  const { user, userData, loading, exchangeRates } = useAuth();
  const [activeVideo, setActiveVideo] = useState<{id: string, title: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [busy, setBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [taskConfig, setTaskConfig] = useState<{ allowedDays: number[], baseReward: number } | null>(null);

  useEffect(() => {
    get(ref(db, "settings/tasks/youtube")).then(snap => {
      if (snap.exists()) setTaskConfig(snap.val());
      else setTaskConfig({ allowedDays: [5], baseReward: 1000 });
    });
  }, []);

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = new Date().getDay();
  const allowedDays = taskConfig?.allowedDays || [5];
  const isAvailable = allowedDays.includes(dayOfWeek);
  const currentDayName = DAYS[dayOfWeek];

  const country = userData?.country || "Tanzania";
  const currency = country === "Zambia" ? "ZMW" : country === "Burundi" ? "BIF" : country === "Mozambique" ? "MZN" : country === "Congo" ? "CDF" : "TZS";
  const rate = exchangeRates[country] || 1;
  const rewardAmount = Number(((taskConfig?.baseReward || 1000) * rate).toFixed(2));
  
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
    if (!activeVideo) return;
    setIsPlaying(false);

    let player: any;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      player = new window.YT.Player('yt-player', {
        events: {
          'onStateChange': (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    return () => {
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
    };
  }, [activeVideo]);

  const claimReward = async () => {
    if (!user || !activeVideo) return;
    setBusy(true);
    try {
      const dbRef = ref(db, `users/${user.uid}`);
      const snap = await get(dbRef);
      if (snap.exists()) {
        const data = snap.val();
        const watched = data.watchedYouTube || {};
        if (watched[activeVideo.id]) {
          throw new Error("You have already claimed this video.");
        }
        
        watched[activeVideo.id] = Date.now();
        const currentEarnings = Number(data.youtubeEarnings || 0);
        
        await update(dbRef, {
          watchedYouTube: watched,
          youtubeEarnings: currentEarnings + rewardAmount
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
    return !!(userData?.watchedYouTube && userData.watchedYouTube[id]);
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
              <i className="fa-brands fa-youtube" style={{ color: "#ff0000" }}></i> YouTube Videos
            </h1>
            <p className="muted">Watch and engage with YouTube videos to earn {rewardAmount} {currency} per video.</p>
          </div>

          {message.text && (
            <div className="alert" style={{ marginBottom: 24, background: message.type === "success" ? "rgba(16,185,129,0.1)" : undefined, borderColor: message.type === "success" ? "var(--accent2)" : undefined, color: message.type === "success" ? "var(--accent2)" : undefined }}>
              {message.text}
            </div>
          )}

          {!isAvailable && (
            <div className="card" style={{ padding: 32, textAlign: "center", border: "1px solid rgba(255, 0, 0, 0.3)", background: "rgba(255,0,0,0.05)" }}>
              <i className="fa-brands fa-youtube" style={{ fontSize: 48, color: "#ff0000", marginBottom: 16 }}></i>
              <h2>Available on {allowedDays.map(d => DAYS[d]).join(", ")}</h2>
              <p className="muted" style={{ fontSize: 16 }}>Today is <strong>{currentDayName}</strong>.</p>
              <div style={{ marginTop: 16, display: "inline-block", background: "rgba(255,0,0,0.1)", padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(255,0,0,0.2)" }}>
                {daysRemaining > 0 ? (
                  <>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#ff0000" }}>{daysRemaining}</span>
                    <span style={{ marginLeft: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, fontSize: 14 }}>Days Remaining</span>
                  </>
                ) : (
                   <span style={{ color: "#ff0000", fontWeight: 700 }}>Task is not available right now.</span>
                )}
              </div>
            </div>
          )}

      {isAvailable && (
        <div className="grid">
          {VIDEOS.map((vid) => {
            const watched = hasWatched(vid.id);
            return (
              <div key={vid.id} className="card breathe" style={{ padding: 16, border: "1px solid rgba(255, 0, 0, 0.2)", background: "rgba(5, 8, 22, 0.6)", animationDuration: "6s" }}>
                <div style={{ width: "100%", height: 180, background: "#000", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                  <img src={`https://img.youtube.com/vi/${vid.id}/hqdefault.jpg`} alt="thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                  <i className="fa-brands fa-youtube" style={{ fontSize: 48, color: "#ff0000", position: "absolute" }}></i>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{vid.title}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--accent2)", fontWeight: 700 }}>Earn {rewardAmount} {currency}</span>
                  {watched ? (
                    <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 14 }}><i className="fa-solid fa-check"></i> Watched</span>
                  ) : (
                    <button 
                      className="btn" 
                      style={{ background: "linear-gradient(135deg, #ff0000, #990000)", color: "#fff", border: "none" }}
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
          <div style={{ width: "100%", maxWidth: 800 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{activeVideo.title}</h3>
              <button onClick={() => setActiveVideo(null)} style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: 24, cursor: "pointer" }}>&times;</button>
            </div>
            
            <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 12, overflow: "hidden" }}>
              <iframe 
                id="yt-player"
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&enablejsapi=1`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>

            <div style={{ marginTop: 24, padding: 20, background: "rgba(255,255,255,0.05)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {timeLeft > 0 ? (
                <>
                  <div style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Time Remaining</div>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: isPlaying ? "#ff0000" : "var(--muted)" }}>{timeLeft}s</div>
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
