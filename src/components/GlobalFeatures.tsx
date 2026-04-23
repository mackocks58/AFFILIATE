import { useEffect, useState } from "react";

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518605368461-1ee7e161328e?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516477028120-e79e6bd4b6e8?q=80&w=2000&auto=format&fit=crop"
];

export function GlobalFeatures() {
  const [bgIndex, setBgIndex] = useState(0);

  // Handle sliding background images
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  return (
    <>
      <div 
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: -1,
          backgroundImage: `url(${BACKGROUND_IMAGES[bgIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 1s ease-in-out",
          opacity: 0.05, /* Reduced opacity for light theme */
          pointerEvents: "none"
        }}
      />
    </>
  );
}

