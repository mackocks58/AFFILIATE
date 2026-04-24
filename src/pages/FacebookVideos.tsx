import { useState, useEffect } from "react";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { ref, update, get } from "firebase/database";
import { db } from "@/firebase";

const VIDEOS = [
  { id: "https://www.facebook.com/facebook/videos/10153231379946729/", title: "Inspirational Story" },
  { id: "https://www.facebook.com/facebook/videos/10153231379946730/", title: "Cooking Recipe" },
  { id: "https://www.facebook.com/facebook/videos/10153231379946731/", title: "Travel Vlog" },
  { id: "https://www.facebook.com/facebook/videos/10153231379946732/", title: "Tech Review" }
];

export default function FacebookVideos() {
  const { user, userData, loading } = useAuth();
  const [activeVideo, setActiveVideo] = useState<{id: string, title: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [busy, setBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = new Date().getDay();
  const targetDay = 6; // 6 = Saturday
  const isAvailable = dayOfWeek === targetDay;
  const currentDayName = DAYS[dayOfWeek];
  
  const getDaysUntil = (target: number) => {
    let diff = target - dayOfWeek;
    if (diff <= 0) diff += 7;
    return diff;
  };
  const daysRemaining = getDaysUntil(targetDay);

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
        const watched = data.watchedFacebook || {};
        
        // Encode URL to make it a valid firebase key, or use a hash. B64 encode:
        const vidKey = btoa(activeVideo.id).replace(/[/+=]/g, '_');

        if (watched[vidKey]) {
          throw new Error("You have already claimed this video.");
        }
        
        watched[vidKey] = Date.now();
        const currentEarnings = Number(data.facebookEarnings || 0);
        
        await update(dbRef, {
          watchedFacebook: watched,
          facebookEarnings: currentEarnings + 500
        });
        
        setMessage({ type: "success", text: "Successfully earned 500 TZS!" });
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
    const vidKey = btoa(id).replace(/[/+=]/g, '_');
    return !!(userData?.watchedFacebook && userData.watchedFacebook[vidKey]);
  };

  return (
    <Shell>
      {loading || !userData ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 40, color: "var(--accent)" }}></i>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 32 }}>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-brands fa-facebook" style={{ color: "#1877f2" }}></i> Facebook Videos
            </h1>
            <p className="muted">Watch and engage with Facebook videos to earn 500 TZS per video.</p>
          </div>

          {message.text && (
            <div className="alert" style={{ marginBottom: 24, background: message.type === "success" ? "rgba(16,185,129,0.1)" : undefined, borderColor: message.type === "success" ? "var(--accent2)" : undefined, color: message.type === "success" ? "var(--accent2)" : undefined }}>
              {message.text}
            </div>
          )}

          {!isAvailable && (
            <div className="card" style={{ padding: 32, textAlign: "center", border: "1px solid rgba(24, 119, 242, 0.3)", background: "rgba(24,119,242,0.05)" }}>
              <i className="fa-brands fa-facebook" style={{ fontSize: 48, color: "#1877f2", marginBottom: 16 }}></i>
              <h2>Available on Saturdays Only</h2>
              <p className="muted" style={{ fontSize: 16 }}>Today is <strong>{currentDayName}</strong>.</p>
              <div style={{ marginTop: 16, display: "inline-block", background: "rgba(24,119,242,0.1)", padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(24,119,242,0.2)" }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#1877f2" }}>{daysRemaining}</span>
                <span style={{ marginLeft: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, fontSize: 14 }}>Days Remaining</span>
              </div>
            </div>
          )}

      {isAvailable && (
        <div className="grid">
          {VIDEOS.map((vid) => {
            const watched = hasWatched(vid.id);
            return (
              <div key={vid.id} className="card breathe" style={{ padding: 16, border: "1px solid rgba(24, 119, 242, 0.2)", background: "rgba(5, 8, 22, 0.6)", animationDuration: "6s" }}>
                <div style={{ width: "100%", height: 180, background: "#000", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <i className="fa-brands fa-facebook" style={{ fontSize: 48, color: "#1877f2", position: "absolute" }}></i>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{vid.title}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--accent2)", fontWeight: 700 }}>Earn 500 TZS</span>
                  {watched ? (
                    <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 14 }}><i className="fa-solid fa-check"></i> Watched</span>
                  ) : (
                    <button 
                      className="btn" 
                      style={{ background: "linear-gradient(135deg, #1877f2, #0055ff)", color: "#fff", border: "none", fontWeight: 700 }}
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
          <div style={{ width: "100%", maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{activeVideo.title}</h3>
              <button onClick={() => setActiveVideo(null)} style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: 24, cursor: "pointer" }}>&times;</button>
            </div>
            
            <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 12, overflow: "hidden", display: "flex", justifyContent: "center" }}>
              <iframe 
                width="560" 
                height="315" 
                src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(activeVideo.id)}&show_text=false&width=560`} 
                title="Facebook video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>

            <div style={{ marginTop: 24, padding: 20, background: "rgba(255,255,255,0.05)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {timeLeft > 0 ? (
                <>
                  <div style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Time Remaining</div>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: isPlaying ? "#1877f2" : "var(--muted)" }}>{timeLeft}s</div>
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
