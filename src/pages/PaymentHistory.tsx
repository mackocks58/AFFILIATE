import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import type { UserPayment } from "@/types";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

export default function PaymentHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, UserPayment> | null>(null);

  useEffect(() => {
    if (!user) {
      setRows(null);
      return;
    }
    const r = ref(db, `userPayments/${user.uid}`);
    return onValue(r, (snap) => setRows(snap.val() as Record<string, UserPayment> | null));
  }, [user]);

  const list = useMemo(() => {
    if (!rows) return [];
    return Object.entries(rows)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [rows]);

  return (
    <Shell>
      <h1 className="page-title">Payment history</h1>
      {!user && (
        <div className="alert">
          Log in to see your payment history. <Link to="/login">Log in</Link>
        </div>
      )}

      {user && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Betslip</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(Number(p.createdAt)).toLocaleString()}</td>
                    <td>{String(p.status)}</td>
                    <td>
                      {p.amount} {p.currency}
                    </td>
                    <td>
                      {p.betslipId ? (
                        <Link className="btn btn-ghost" to={`/slip/${p.betslipId}`}>
                          Open
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {p.reference || p.palmpesaTransid || p.selcomTransid || "—"}
                    </td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
