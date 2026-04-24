import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "@/firebase";

export default function Register() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(params.get("ref") || "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const countriesList = [
    { value: "Tanzania", code: "tz" },
    { value: "Zambia", code: "zm" },
    { value: "Burundi", code: "bi" },
    { value: "Mozambique", code: "mz" },
    { value: "Congo", code: "cd" }
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!country) {
      setError("Please select your country.");
      setBusy(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const displayName = username.trim() || "User";
      await updateProfile(cred.user, { displayName });
      
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      let initialBonus = 15000;
      if (country === "Zambia") initialBonus = 157.5;
      if (country === "Burundi") initialBonus = 17250;
      if (country === "Mozambique") initialBonus = 400;
      if (country === "Congo") initialBonus = 15000;

      await set(ref(db, `users/${cred.user.uid}`), {
        displayName,
        username: username.toLowerCase().trim(),
        email: email.trim(),
        affiliateCode: newCode,
        referredBy: referralCode.trim() || null,
        status: "inactive",
        country,
        balance: 0,
        deposited: 0,
        bonus: initialBonus,
        createdAt: Date.now()
      });

      if (referralCode.trim()) {
        await set(ref(db, `referrals/${referralCode.trim()}/${cred.user.uid}`), {
          displayName,
          createdAt: Date.now()
        });
      }

      nav("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not register.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: "100%", minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "center", padding: "16px", position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
      {/* Glowing orb background */}
      <div className="breathe" style={{ position: "absolute", width: 400, height: 400, background: "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)", borderRadius: "50%", zIndex: 0 }}></div>
      
      <div className="card" style={{ maxWidth: 440, width: "100%", zIndex: 1, border: "1px solid rgba(56, 189, 248, 0.3)", boxShadow: "0 0 50px rgba(56, 189, 248, 0.1)", background: "linear-gradient(180deg, rgba(17, 27, 51, 0.85), rgba(5, 8, 22, 0.95))", backdropFilter: "blur(16px)", overflow: "visible" }}>
        <div className="card-body" style={{ padding: "24px 20px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div className="animated-star" style={{ width: 64, height: 64, margin: "0 auto 16px" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="#38bdf8" stroke="#a16207" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span className="brand-text-eaglestar" style={{ fontSize: 42 }}>EAGLE STAR</span>
              </div>
              <h1 style={{ margin: 0, background: "linear-gradient(to right, #050816, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 24, letterSpacing: "-0.02em" }}>Create Account</h1>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 15 }}>Join us to get the best premium picks.</p>
            </div>

            {error && <div className="alert" style={{ marginBottom: 20 }}>{error}</div>}
            
            <form className="grid" style={{ gap: 12 }} onSubmit={submit}>
              <div className="field">
                <label htmlFor="username" style={{ color: "var(--text)", opacity: 0.9 }}>Username</label>
                <input
                  id="username"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(56, 189, 248, 0.2)", padding: "10px 12px" }}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="email" style={{ color: "var(--text)", opacity: 0.9 }}>Email Address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(56, 189, 248, 0.2)", padding: "10px 45px 10px 12px", width: "100%" }}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ fontSize: 16 }}></i>
                  </button>
                </div>
              </div>
              <div className="field" style={{ position: "relative" }}>
                <label style={{ color: "var(--text)", opacity: 0.9 }}>Country</label>
                <div 
                  className="input"
                  style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(56, 189, 248, 0.2)", padding: "10px 12px", color: "var(--text)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", position: "relative" }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {country ? (
                    <>
                      <img 
                        src={`https://flagcdn.com/w20/${countriesList.find(c => c.value === country)?.code}.png`} 
                        alt={country} 
                        style={{ width: 20, height: 'auto', borderRadius: 2 }}
                      />
                      {country}
                    </>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>Select your country...</span>
                  )}
                  <div style={{ marginLeft: "auto", transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>

                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#050816", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: 12, marginTop: 4, overflowY: "auto", overflowX: "hidden", maxHeight: 140, zIndex: 50, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                    {countriesList.map(c => (
                      <div 
                        key={c.value}
                        onClick={() => { setCountry(c.value); setDropdownOpen(false); }}
                        style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: country === c.value ? "rgba(56, 189, 248, 0.15)" : "transparent" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(56, 189, 248, 0.25)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = country === c.value ? "rgba(56, 189, 248, 0.15)" : "transparent"}
                      >
                        <img src={`https://flagcdn.com/w20/${c.code}.png`} alt={c.value} style={{ width: 20, height: 'auto', borderRadius: 2 }} />
                        {c.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn breathe" type="submit" disabled={busy} style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(161,98,7,0.3))", borderColor: "rgba(56,189,248,0.5)", color: "var(--text)", fontWeight: 700, padding: "12px", marginTop: "4px", boxShadow: "0 0 20px rgba(56, 189, 248, 0.15)", fontSize: 15 }}>
                {busy ? "Creating…" : "Create Account Securely"}
              </button>
            </form>
            
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p className="muted" style={{ fontSize: 15 }}>
                Already have an account? <Link to="/login" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600 }}>Log in</Link>
              </p>
            </div>
          </div>
        </div>


    </div>
  );
}





