import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/firebase";
import { apiUrl } from "@/lib/apiBase";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      let loginEmail = email.trim();
      if (!loginEmail.includes('@')) {
        const res = await fetch(apiUrl(`/api/auth/resolve-username/${encodeURIComponent(loginEmail.toLowerCase())}`));
        if (!res.ok) {
          throw new Error("Username not found.");
        }
        const data = await res.json();
        if (data.email) {
          loginEmail = data.email;
        } else {
          throw new Error("Could not resolve username.");
        }
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      nav("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: "100%", minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "center", padding: "16px", position: "relative", overflow: "hidden" }}>
      {/* Glowing orb background */}
      <div className="breathe" style={{ position: "absolute", width: 300, height: 300, background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)", borderRadius: "50%", zIndex: 0 }}></div>
      
      <div className="card" style={{ maxWidth: 400, width: "100%", zIndex: 1, border: "1px solid rgba(56, 189, 248, 0.3)", boxShadow: "0 0 50px rgba(56, 189, 248, 0.1)", background: "linear-gradient(180deg, rgba(17, 27, 51, 0.85), rgba(5, 8, 22, 0.95))", backdropFilter: "blur(16px)" }}>
        <div className="card-body" style={{ padding: "24px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div className="animated-star" style={{ width: 64, height: 64, margin: "0 auto 16px" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="#38bdf8" stroke="#a16207" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span className="brand-text-eaglestar" style={{ fontSize: 42 }}>EAGLE STAR</span>
              </div>
              <h1 style={{ margin: 0, background: "linear-gradient(to right, #050816, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 24, letterSpacing: "-0.02em" }}>Welcome Back</h1>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 15 }}>Sign in to access your premium picks.</p>
            </div>

            {error && <div className="alert" style={{ marginBottom: 20 }}>{error}</div>}
            
            <form className="grid" style={{ gap: 12 }} onSubmit={submit}>
              <div className="field">
                <label htmlFor="email" style={{ color: "var(--text)", opacity: 0.9 }}>Username or Email</label>
                <input
                  id="email"
                  className="input"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(56, 189, 248, 0.2)", padding: "10px 12px" }}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password" style={{ color: "var(--text)", opacity: 0.9 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(56, 189, 248, 0.2)", padding: "10px 45px 10px 12px", width: "100%" }}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 16 }}></i>
                  </button>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input 
                  type="checkbox" 
                  id="rememberMe" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#38bdf8" }}
                />
                <label htmlFor="rememberMe" style={{ color: "var(--muted)", fontSize: 14, cursor: "pointer" }}>Remember me</label>
              </div>

              <button className="btn breathe" type="submit" disabled={busy} style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(161,98,7,0.3))", borderColor: "rgba(56,189,248,0.5)", color: "var(--text)", fontWeight: 700, padding: "16px", marginTop: "4px", boxShadow: "0 0 20px rgba(56, 189, 248, 0.15)", fontSize: 16 }}>
                {busy ? "Authenticating…" : "Sign In Securely"}
              </button>
            </form>
            
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p className="muted" style={{ fontSize: 15, marginBottom: 8 }}>
                <Link to="/forgot-password" style={{ color: "rgba(56, 189, 248, 0.8)", textDecoration: "underline" }}>Forgot your password?</Link>
              </p>
              <p className="muted" style={{ fontSize: 15, margin: 0 }}>
                New here? <Link to="/register" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600 }}>Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}





