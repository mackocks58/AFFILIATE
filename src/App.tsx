import type { ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Home from "@/pages/Home";
import BetslipDetail from "@/pages/BetslipDetail";
import MovieGroupDetail from "@/pages/MovieGroupDetail";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Register from "@/pages/Register";
import Admin from "@/pages/Admin";
import PaymentHistory from "@/pages/PaymentHistory";
import Support from "@/pages/Support";
import Chat from "@/pages/Chat";
import PaymentReturn from "@/pages/PaymentReturn";
import PaymentCancel from "@/pages/PaymentCancel";
import Account from "@/pages/Account";
import Betslips from "@/pages/Betslips";
import Notifications from "@/pages/Notifications";
import Movies from "@/pages/Movies";
import Affiliate from "@/pages/Affiliate";
import LiveMatches from "@/pages/LiveMatches";
import BindAccount from "@/pages/BindAccount";
import Withdraw from "@/pages/Withdraw";
import WeeklyChallenge from "@/pages/WeeklyChallenge";
import { Shell } from "@/components/Shell";
import { GlobalFeatures } from "@/components/GlobalFeatures";
import { useState } from "react";
import { auth } from "@/firebase";
import { apiUrl } from "@/lib/apiBase";

function AdminRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();



  if (!user) return <Navigate to="/register" replace />;
  return children;
}

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();



  if (!user) return <Navigate to="/register" replace />;
  return children;
}

function GlobalActivationModal() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();

  // Pre-fill from stored user data
  const storedName = (userData?.displayName || user?.displayName || "").trim();
  const storedPhone = (userData?.phone || "").trim();

  const [fullName, setFullName] = useState(storedName);
  const [phone, setPhone] = useState(storedPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user || !userData) return null;
  if (userData.status !== "inactive") return null;

  async function startPayment() {
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setError("Please enter your full name (at least two words, e.g. John Smith).");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(apiUrl("/api/checkout/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token,
          activationPayment: true,
          buyer: {
            name: fullName.trim(),
            email: userData?.email || user?.email || "user@example.com",
            phone: phone.trim()
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Payment could not be started.");

      // Store orderId — PaymentReturn will poll and update via Firebase real-time
      sessionStorage.setItem("checkoutOrderId", String(data.orderId));
      sessionStorage.setItem("checkoutActivation", "true");
      sessionStorage.removeItem("checkoutBetslipId");

      navigate("/payment/return");
    } catch (e: any) {
      setError(e.message || "An error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 16 }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", background: "#050816", border: "1px solid rgba(56,189,248,0.4)", boxShadow: "0 0 40px rgba(56,189,248,0.15)" }}>
        <div className="card-body">
          <h2 style={{ marginTop: 0, color: "#38bdf8", fontSize: 22 }}>🚀 Activate Your Account</h2>
          <p className="muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
            Pay <strong style={{ color: "var(--text)" }}>500 TZS</strong> via USSD to activate your account and unlock the affiliate commission system.
          </p>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ background: "#e60000", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4 }}>VODACOM</div>
            <div style={{ background: "#003b70", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4 }}>TIGO</div>
            <div style={{ background: "#cc0000", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4 }}>AIRTEL</div>
            <div style={{ background: "#f26522", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4 }}>HALOTEL</div>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="activation-name">Full Name <span style={{ color: "var(--muted)", fontSize: 12 }}>(two words minimum)</span></label>
            <input
              id="activation-name"
              className="input"
              placeholder="e.g. John Smith"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              disabled={busy}
              autoComplete="name"
            />
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="activation-phone">Phone Number <span style={{ color: "var(--muted)", fontSize: 12 }}>(e.g. 0712345678)</span></label>
            <input
              id="activation-phone"
              className="input"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={busy}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>

          {error && (
            <div className="alert" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>{error}</div>
          )}

          <button
            className="btn breathe"
            style={{ width: "100%", padding: 14, marginBottom: 12, background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(16,185,129,0.35))", borderColor: "rgba(56,189,248,0.5)", color: "var(--text)", fontWeight: 700, fontSize: 16, opacity: busy ? 0.7 : 1 }}
            disabled={busy || !phone.trim() || !fullName.trim()}
            onClick={() => void startPayment()}
          >
            {busy ? "Initiating Payment…" : "Pay 500 TZS & Activate"}
          </button>

          <div style={{ textAlign: "center" }}>
            <button className="btn btn-ghost" onClick={() => logout()} style={{ fontSize: 13, color: "var(--muted)" }}>
              Logout Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#050816", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", zIndex: 999999 }}>
        <div style={{ position: "relative", width: 64, height: 64, marginBottom: 16 }}>
          <svg width="64" height="64" viewBox="0 0 50 50" style={{ position: "absolute", top: 0, left: 0 }}>
            <circle cx="25" cy="25" r="20" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="31.4 31.4" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <div className="brand-mark" style={{ width: 24, height: 24 }}></div>
          </div>
        </div>
        <div className="brand-text-eaglestar" style={{ fontSize: 16, letterSpacing: "0.1em" }}>EAGLE STAR</div>
      </div>
    );
  }

  return (
    <>
      <GlobalFeatures />
      <GlobalActivationModal />
      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/bind-account" element={<ProtectedRoute><BindAccount /></ProtectedRoute>} />
        <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
        <Route path="/affiliate" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
        <Route path="/weekly-challenge" element={<ProtectedRoute><WeeklyChallenge /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveMatches /></ProtectedRoute>} />
        <Route path="/slip/:id" element={<ProtectedRoute><BetslipDetail /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payments" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/betslips" element={<ProtectedRoute><Betslips /></ProtectedRoute>} />
        <Route path="/payment/return" element={<PaymentReturn />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="/movies" element={<ProtectedRoute><Movies /></ProtectedRoute>} />
        <Route path="/movies/:groupId" element={<ProtectedRoute><MovieGroupDetail /></ProtectedRoute>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}




