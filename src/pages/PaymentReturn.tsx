import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

type Phase = "wait" | "missing" | "failed";

export default function PaymentReturn() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("wait");

  useEffect(() => {
    if (!user) return;
    const orderId = sessionStorage.getItem("selcomOrderId");
    const betslipId = sessionStorage.getItem("selcomBetslipId");
    if (!orderId) {
      setPhase("missing");
      return;
    }

    const r = ref(db, `userPayments/${user.uid}/${orderId}`);
    const unsub = onValue(r, (snap) => {
      if (!snap.exists()) return;
      const v = snap.val() as { status?: string } | null;
      const s = String(v?.status ?? "pending").toLowerCase();
      if (s === "completed") {
        sessionStorage.removeItem("selcomOrderId");
        sessionStorage.removeItem("selcomBetslipId");
        if (betslipId) nav(`/slip/${betslipId}`, { replace: true });
        else nav("/", { replace: true });
      } else if (s === "failed") {
        setPhase("failed");
      }
    });

    return () => unsub();
  }, [user, nav]);

  return (
    <Shell>
      <h1 className="page-title">Payment status</h1>
      {!user && (
        <div className="card">
          <div className="card-body">
            <div className="alert">Please log in to verify your payment.</div>
            <Link className="btn" to="/login">
              Log in
            </Link>
          </div>
        </div>
      )}

      {user && phase === "wait" && (
        <div className="card">
          <div className="card-body">
            <div className="alert info">
              Confirming payment with Selcom… If you just completed payment, this should update within a few seconds.
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              You can safely open Payment history while you wait.
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn btn-ghost" to="/payments">
                Payment history
              </Link>
              <Link className="btn btn-ghost" to="/">
                Browse
              </Link>
            </div>
          </div>
        </div>
      )}

      {user && phase === "failed" && (
        <div className="card">
          <div className="card-body">
            <div className="alert">Selcom reported a failed payment for this checkout session.</div>
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn" to="/payments">
                Payment history
              </Link>
              <Link className="btn btn-ghost" to="/">
                Browse
              </Link>
            </div>
          </div>
        </div>
      )}

      {user && phase === "missing" && (
        <div className="card">
          <div className="card-body">
            <div className="alert info">No active checkout session was found for this browser tab.</div>
            <Link className="btn" to="/">
              Browse betslips
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}
