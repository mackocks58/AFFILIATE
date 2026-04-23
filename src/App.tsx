import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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
import { useState, useEffect } from "react";
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
  const [phone, setPhone] = useState("");
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "success">("idle");
  const [countdown, setCountdown] = useState(60);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (userData?.status === "active" && paymentState !== "idle") {
      setPaymentState("success");
      setMessage("Payment Successful!");
    }
  }, [userData?.status, paymentState]);

  useEffect(() => {
    let timer: any;
    if (paymentState === "processing" && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [paymentState, countdown]);

  if (!user || !userData) return null;
  if (userData.status !== "inactive" && paymentState !== "success") return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
      <div className="card" style={{ maxWidth: 400, width: "100%", background: "#050816", border: "1px solid var(--accent)" }}>
        <div className="card-body">
          <h2 style={{ marginTop: 0, color: "var(--accent)" }}>Activate Account</h2>
          <p className="muted">Your account is currently inactive. Pay your activation fee to get started.</p>
          
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Phone Number</label>
            <input 
              className="input" 
              placeholder="e.g. 07XXXXXXXX" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              disabled={paymentState !== "idle"}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
            <div style={{ background: "#e60000", color: "var(--text)", fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 4 }}>VODACOM</div>
            <div style={{ background: "#003b70", color: "var(--text)", fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 4 }}>TIGO</div>
            <div style={{ background: "#ff0000", color: "var(--text)", fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 4 }}>AIRTEL</div>
            <div style={{ background: "#f26522", color: "var(--text)", fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 4 }}>HALOTEL</div>
          </div>

          {paymentState === "processing" && (
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto" }}>
                <svg width="64" height="64" viewBox="0 0 50 50" style={{ position: "absolute", top: 0, left: 0 }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="31.4 31.4" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
              <p style={{ margin: "12px 0 4px", fontWeight: 600, color: "#38bdf8" }}>Processing Payment...</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Time remaining: <span style={{ color: "var(--text)", fontWeight: 700 }}>{countdown}s</span></p>
            </div>
          )}

          {paymentState === "success" && (
            <div style={{ textAlign: "center", marginBottom: 20, padding: 16, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: "50%", background: "#10b981", color: "var(--text)", marginBottom: 12, boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3 style={{ margin: "0 0 8px", color: "#10b981", fontSize: 18 }}>Payment Successful!</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>Redirecting to Home...</p>
            </div>
          )}

          {message && paymentState !== "processing" && paymentState !== "success" && <div className="alert" style={{ marginBottom: 16 }}>{message}</div>}

          {paymentState === "idle" && (
            <button 
              className="btn breathe" 
              style={{ width: "100%", padding: 16, marginBottom: 16, background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(16,185,129,0.3))", borderColor: "rgba(56,189,248,0.5)", color: "var(--text)", fontWeight: 700, fontSize: 16 }} 
              disabled={!phone}
              onClick={async () => {
                setPaymentState("processing");
                setCountdown(60);
                setMessage("");
                try {
                  const token = await auth.currentUser?.getIdToken();
                  const res = await fetch(apiUrl("/api/checkout/init"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      idToken: token,
                      activationPayment: true,
                      buyer: { name: userData.displayName || "User", email: userData.email || user.email, phone }
                    })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to initiate payment");

                  // Polling logic
                  let pollCount = 0;
                  const maxPolls = 15; // 15 * 4s = 60s
                  
                  const pollInterval = setInterval(async () => {
                    pollCount++;
                    if (pollCount > maxPolls) {
                      clearInterval(pollInterval);
                      setPaymentState("idle");
                      setMessage("Payment verification timed out. If you paid, it will update shortly.");
                      return;
                    }
                    try {
                      const checkRes = await fetch(apiUrl(`/api/checkout/status/${data.orderId}`));
                      if (!checkRes.ok) return;
                      const checkData = await checkRes.json();
                      if (checkData.status === "completed") {
                        clearInterval(pollInterval);
                        setPaymentState("success");
                        setMessage("Payment Successful!");
                      } else if (checkData.status === "failed") {
                        clearInterval(pollInterval);
                        setPaymentState("idle");
                        setMessage("Payment failed. Please try again.");
                      }
                    } catch (e) {
                      console.error("Polling error", e);
                    }
                  }, 4000);
                  
                  // Also rely on the useEffect listener as a backup
                  const handleUnmount = () => clearInterval(pollInterval);
                  
                } catch (e: any) {
                  setPaymentState("idle");
                  setMessage(e.message || "Error");
                }
              }}
            >
              Pay Now Securely
            </button>
          )}
          
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




