import { useEffect, useState } from "react";

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518605368461-1ee7e161328e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516477028120-e79e6bd4b6e8?q=80&w=2000&auto=format&fit=crop"
];

const ADS = [
  { title: "Special Offer!", caption: "Welcome Bonus", text: "Get 50% off on your first betslip. Register today!", link: "/register", image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=400&auto=format&fit=crop" },
  { title: "Don't Miss Out!", caption: "Weekend Picks", text: "Check out the latest premium picks for this weekend.", link: "/", image: "https://images.unsplash.com/photo-1518605368461-1ee7e161328e?q=80&w=400&auto=format&fit=crop" },
  { title: "Boost Your Odds!", caption: "VIP Channel", text: "Subscribe to our VIP channel for guaranteed results.", link: "/support", image: "https://images.unsplash.com/photo-1516477028120-e79e6bd4b6e8?q=80&w=400&auto=format&fit=crop" },
  { title: "Huge Jackpots!", caption: "Win Big", text: "New high-stakes slips available now. Secure your spot.", link: "/", image: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=400&auto=format&fit=crop" },
  { title: "Refer & Earn", caption: "Affiliate Program", text: "Invite friends and earn free premium slips.", link: "/register", image: "https://images.unsplash.com/photo-1579621970588-a3f5ce599fac?q=80&w=400&auto=format&fit=crop" }
];

export function GlobalFeatures() {
  const [bgIndex, setBgIndex] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [currentAd, setCurrentAd] = useState(ADS[0]);

  // Handle sliding background images
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(bgInterval);
  }, []);

  // Handle random pop-up ads
  useEffect(() => {
    const scheduleNextAd = () => {
      // Randomly show ad between 10 to 30 seconds
      const nextDelay = Math.random() * 20000 + 10000;
      return setTimeout(() => {
        const randomAd = ADS[Math.floor(Math.random() * ADS.length)];
        setCurrentAd(randomAd);
        setShowAd(true);
      }, nextDelay);
    };

    let timerId = scheduleNextAd();

    return () => clearTimeout(timerId);
  }, [showAd]); // Reschedule after an ad is closed

  return (
    <>
      {/* Sliding Background */}
      <div 
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: -1,
          backgroundImage: `url(${BACKGROUND_IMAGES[bgIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 1s ease-in-out",
          opacity: 0.15, // Keep it subtle so content is readable
          pointerEvents: "none"
        }}
      />

      {/* Random Pop-up Ad Modal */}
      {showAd && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          background: "rgba(5, 8, 22, 0.8)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div className="card" style={{ maxWidth: 400, margin: 20, position: "relative" }}>
            <div className="card-body">
              <button 
                onClick={() => setShowAd(false)}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(0,0,0,0.5)", borderRadius: "50%", border: "none", color: "#fff", cursor: "pointer", fontSize: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                &times;
              </button>
              <img src={currentAd.image} alt={currentAd.title} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: "10px 10px 0 0", margin: "-16px -16px 16px", width: "calc(100% + 32px)", maxWidth: "none" }} />
              <div style={{ padding: "0 4px" }}>
                <span className="badge" style={{ marginBottom: 10 }}>{currentAd.caption}</span>
                <h3 style={{ color: "var(--accent)" }}>{currentAd.title}</h3>
                <p style={{ margin: "10px 0 20px" }}>{currentAd.text}</p>
                <a href={currentAd.link} className="btn" style={{ display: "block", textAlign: "center" }} onClick={() => setShowAd(false)}>
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
