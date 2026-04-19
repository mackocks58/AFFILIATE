import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";
import { Shell } from "@/components/Shell";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "75vh", position: "relative" }}>
        {/* Glowing orb background */}
        <div className="breathe" style={{ position: "absolute", width: 400, height: 400, background: "radial-gradient(circle, rgba(250, 204, 21, 0.12) 0%, transparent 70%)", borderRadius: "50%", zIndex: 0 }}></div>
        
        <div className="card" style={{ maxWidth: 440, width: "100%", zIndex: 1, border: "1px solid rgba(250, 204, 21, 0.3)", boxShadow: "0 0 50px rgba(250, 204, 21, 0.1)", background: "linear-gradient(180deg, rgba(17, 27, 51, 0.85), rgba(5, 8, 22, 0.95))", backdropFilter: "blur(16px)" }}>
          <div className="card-body" style={{ padding: "32px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div className="breathe" style={{ width: 64, height: 64, margin: "0 auto 16px", borderRadius: 16, background: "conic-gradient(from 210deg, #fef08a, #facc15, #a16207, #fef08a)", boxShadow: "0 10px 30px rgba(250, 204, 21, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#050816" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              </div>
              <h1 style={{ margin: 0, background: "linear-gradient(to right, #fef08a, #facc15)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 32, letterSpacing: "-0.02em" }}>Welcome Back</h1>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 15 }}>Sign in to access your premium betslips.</p>
            </div>

            {error && <div className="alert" style={{ marginBottom: 20 }}>{error}</div>}
            
            <form className="grid" style={{ gap: 20 }} onSubmit={submit}>
              <div className="field">
                <label htmlFor="email" style={{ color: "#fef08a", opacity: 0.9 }}>Email Address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(250, 204, 21, 0.2)", padding: "14px 16px" }}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password" style={{ color: "#fef08a", opacity: 0.9 }}>Password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(250, 204, 21, 0.2)", padding: "14px 16px" }}
                  required
                />
              </div>
              <button className="btn breathe" type="submit" disabled={busy} style={{ background: "linear-gradient(135deg, rgba(250,204,21,0.15), rgba(161,98,7,0.3))", borderColor: "rgba(250,204,21,0.5)", color: "#fef08a", fontWeight: 700, padding: "16px", marginTop: "8px", boxShadow: "0 0 20px rgba(250, 204, 21, 0.15)", fontSize: 16 }}>
                {busy ? "Authenticating…" : "Sign In Securely"}
              </button>
            </form>
            
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p className="muted" style={{ fontSize: 15 }}>
                New here? <Link to="/register" style={{ color: "#facc15", textDecoration: "underline", fontWeight: 600 }}>Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
