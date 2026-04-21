import { useState } from "react";
import { Shell } from "@/components/Shell";

type Movie = {
  id: string;
  title: string;
  category: string;
  year: string;
  duration: string;
};

const MOVIES: Movie[] = [
  { id: "QdBZY2fkU-0", title: "GTA VI Trailer", category: "Gaming", year: "2025", duration: "1:30" },
  { id: "TcMBFSGVi1c", title: "Avengers: Endgame", category: "Sci-Fi", year: "2019", duration: "2:25" },
  { id: "JfVOs4VSpmA", title: "Spider-Man: No Way Home", category: "Action", year: "2021", duration: "3:03" },
  { id: "YoHD9XEInc0", title: "Inception", category: "Sci-Fi", year: "2010", duration: "2:28" },
  { id: "zSWdZVtXT7E", title: "Interstellar", category: "Sci-Fi", year: "2014", duration: "2:32" },
  { id: "EXeTwQWrcwY", title: "The Dark Knight", category: "Action", year: "2008", duration: "2:30" },
  { id: "zAGVQLHvwOY", title: "Joker", category: "Drama", year: "2019", duration: "2:24" },
  { id: "Way9Dexny3w", title: "Dune: Part Two", category: "Sci-Fi", year: "2024", duration: "3:01" },
  { id: "uYPbbksJxIg", title: "Oppenheimer", category: "Drama", year: "2023", duration: "3:06" },
  { id: "pBk4NYhWNMM", title: "Barbie", category: "Comedy", year: "2023", duration: "2:40" },
  { id: "d9MyW72ELq0", title: "Avatar: The Way of Water", category: "Sci-Fi", year: "2022", duration: "2:28" },
  { id: "giXco2jaZ_4", title: "Top Gun: Maverick", category: "Action", year: "2022", duration: "2:11" },
  { id: "mqqft2x_Aa4", title: "The Batman", category: "Action", year: "2022", duration: "2:38" },
  { id: "shW9i6k8cB0", title: "Spider-Man: Across the Spider-Verse", category: "Animation", year: "2023", duration: "2:29" },
  { id: "yjRHZEUamCc", title: "John Wick: Chapter 4", category: "Action", year: "2023", duration: "2:29" },
  { id: "73_1biom1Xg", title: "Deadpool & Wolverine", category: "Action", year: "2024", duration: "2:38" },
  { id: "4rgYUipGJNo", title: "Gladiator II", category: "Action", year: "2024", duration: "3:05" },
  { id: "2m1drlOZSDw", title: "Mission: Impossible - Dead Reckoning", category: "Action", year: "2023", duration: "2:16" },
  { id: "xt0O41OcuFk", title: "Kingdom of the Planet of the Apes", category: "Sci-Fi", year: "2024", duration: "2:27" },
  { id: "lV1OOlGwExM", title: "Godzilla x Kong: The New Empire", category: "Action", year: "2024", duration: "2:49" },
  { id: "cjC-mKz_tAE", title: "Furiosa: A Mad Max Saga", category: "Action", year: "2024", duration: "2:36" },
  { id: "28K-4QGf8B0", title: "Ghostbusters: Frozen Empire", category: "Comedy", year: "2024", duration: "2:13" },
  { id: "_inKs4eeHiI", title: "Kung Fu Panda 4", category: "Animation", year: "2024", duration: "2:27" },
  { id: "qQlr9-rF32A", title: "Despicable Me 4", category: "Animation", year: "2024", duration: "2:25" },
  { id: "LEjhY15eCx0", title: "Inside Out 2", category: "Animation", year: "2024", duration: "2:18" },
  { id: "aqz-KE-bpKQ", title: "Big Buck Bunny", category: "Animation", year: "2008", duration: "9:56" },
  { id: "eRsGyueVLvQ", title: "Sintel", category: "Animation", year: "2010", duration: "14:48" },
  { id: "OHisp5H6Nks", title: "Tears of Steel", category: "Sci-Fi", year: "2012", duration: "12:14" }
];

export default function Movies() {
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);

  return (
    <Shell>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 className="page-title" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span className="breathe" style={{ display: "inline-block", color: "var(--accent)" }}>🎬</span> Movie Trailers & Shorts
        </h1>
        <p className="muted" style={{ margin: "0 0 16px 0" }}>Watch high-quality trailers and full open-source short movies directly from YouTube.</p>
      </div>

      <div className="grid cols-3" style={{ gap: 24 }}>
        {MOVIES.map((movie) => (
          <div 
            key={movie.id} 
            className="card" 
            style={{ 
              background: "linear-gradient(135deg, rgba(11, 18, 36, 0.9), rgba(5, 8, 22, 0.95))", 
              border: "1px solid var(--stroke)", 
              transition: "transform 0.3s ease, box-shadow 0.3s ease", 
              cursor: "pointer",
              overflow: "hidden"
            }}
            onClick={() => setActiveMovie(movie)}
            onMouseEnter={(e) => { 
              e.currentTarget.style.transform = "translateY(-6px)"; 
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(16, 185, 129, 0.2)"; 
              e.currentTarget.style.borderColor = "var(--accent)"; 
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = "none"; 
              e.currentTarget.style.boxShadow = "var(--shadow)"; 
              e.currentTarget.style.borderColor = "var(--stroke)"; 
            }}
          >
            <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
              {/* 16:9 Aspect Ratio */}
              <img 
                src={`https://img.youtube.com/vi/${movie.id}/maxresdefault.jpg`}
                onError={(e) => {
                  // Fallback to hqdefault if maxresdefault doesn't exist
                  e.currentTarget.src = `https://img.youtube.com/vi/${movie.id}/hqdefault.jpg`;
                }}
                alt={movie.title}
                style={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover" 
                }} 
              />
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 50%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: 16
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <span style={{ background: "rgba(16, 185, 129, 0.8)", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {movie.category}
                  </span>
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 4 }}>
                    {movie.duration}
                  </span>
                </div>
              </div>
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
                opacity: 0.9
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div className="card-body" style={{ padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {movie.title}
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--muted)" }}>
                {movie.year}
              </p>
            </div>
          </div>
        ))}
      </div>

      {activeMovie && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.9)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backdropFilter: "blur(10px)"
        }} onClick={() => setActiveMovie(null)}>
          <div style={{ 
            width: "100%", 
            maxWidth: 1000, 
            background: "#000", 
            borderRadius: 16, 
            overflow: "hidden", 
            position: "relative",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            border: "1px solid var(--stroke)"
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setActiveMovie(null)}
              style={{
                position: "absolute",
                top: 16, right: 16,
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                width: 36, height: 36,
                borderRadius: "50%",
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20
              }}
            >
              ✕
            </button>
            <div style={{ position: "relative", paddingTop: "56.25%" }}>
              <iframe 
                src={`https://www.youtube.com/embed/${activeMovie.id}?autoplay=1`} 
                title={activeMovie.title}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0, left: 0,
                  width: "100%", height: "100%"
                }}
              ></iframe>
            </div>
            <div style={{ padding: 20, background: "var(--bg1)" }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 24 }}>{activeMovie.title}</h2>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontWeight: 600 }}>
                <span style={{ color: "var(--accent)" }}>{activeMovie.year}</span>
                <span style={{ color: "var(--muted)" }}>•</span>
                <span style={{ color: "var(--muted)" }}>{activeMovie.category}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
