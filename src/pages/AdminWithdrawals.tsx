import { useEffect, useState } from "react";
import { onValue, ref, remove, update, get } from "firebase/database";
import { db } from "@/firebase";

export function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "rejected">("pending");

  useEffect(() => {
    const r = ref(db, "withdrawals");
    return onValue(r, snap => {
      if (!snap.exists()) return setWithdrawals([]);
      const vals = snap.val();
      const arr = Object.entries(vals).map(([id, data]: any) => ({ id, ...data }));
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setWithdrawals(arr);
    });
  }, []);

  const filtered = withdrawals.filter(w => filter === "all" || w.status === filter);

  async function handleApprove(w: any) {
    if (!confirm("Mark this withdrawal as completed? This will update the user's totalWithdrawn stat.")) return;
    setBusy(w.id);
    try {
      // Get user to update totalWithdrawn
      const uSnap = await get(ref(db, `users/${w.uid}`));
      let totalWithdrawn = 0;
      if (uSnap.exists()) {
         totalWithdrawn = Number(uSnap.val().totalWithdrawn || 0);
      }
      totalWithdrawn += Number(w.amount);

      await update(ref(db), {
        [`withdrawals/${w.id}/status`]: "completed",
        [`withdrawals/${w.id}/processedAt`]: Date.now(),
        [`users/${w.uid}/totalWithdrawn`]: totalWithdrawn
      });
      alert("Approved successfully!");
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setBusy(null);
  }

  async function handleReject(w: any) {
    if (!confirm("Reject this withdrawal? The requested amount will be refunded to their balance.")) return;
    setBusy(w.id);
    try {
      const uSnap = await get(ref(db, `users/${w.uid}`));
      let balance = 0;
      if (uSnap.exists()) {
         balance = Number(uSnap.val().balance || 0);
      }
      balance += Number(w.amount);

      await update(ref(db), {
        [`withdrawals/${w.id}/status`]: "rejected",
        [`withdrawals/${w.id}/processedAt`]: Date.now(),
        [`users/${w.uid}/balance`]: balance
      });
      alert("Rejected and refunded successfully.");
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setBusy(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this record? (No refund will be issued)")) return;
    setBusy(id);
    try {
      await remove(ref(db, `withdrawals/${id}`));
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setBusy(null);
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied: " + text);
  };

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Withdrawal Requests</h2>
          <select className="select" style={{ width: 150 }} value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>User Account Details</th>
                <th>Amount & Tax</th>
                <th>Final Payout</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const tax = w.amount * 0.13;
                const afterTax = w.amount - tax;
                
                return (
                  <tr key={w.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }} className="muted">
                      {w.createdAt ? new Date(w.createdAt).toLocaleString() : "N/A"}
                    </td>
                    <td>
                      {w.details ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{w.details.accountName}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span className="mono" style={{ color: "var(--accent)" }}>{w.details.network} - {w.details.accountNumber}</span>
                            <button className="btn btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => copyText(w.details.accountNumber)}>Copy</button>
                          </div>
                        </>
                      ) : <span className="muted">No details</span>}
                    </td>
                    <td>
                      <div><strong>{w.amount}</strong> <span style={{ fontSize: 12 }}>{w.currency}</span></div>
                      <div className="muted" style={{ fontSize: 12 }}>Tax (13%): -{tax.toFixed(2)}</div>
                    </td>
                    <td>
                      <strong style={{ color: "#10b981", fontSize: 16 }}>{afterTax.toFixed(2)}</strong> <span style={{ fontSize: 12, opacity: 0.7 }}>{w.currency}</span>
                    </td>
                    <td>
                      <span className={`pill ${w.status === "completed" ? "success" : w.status === "rejected" ? "danger" : "warning"}`}>
                        {w.status}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: 8, whiteSpace: "nowrap" }}>
                      {w.status === "pending" && (
                        <>
                          <button className="btn" style={{ padding: "4px 8px", fontSize: 12, background: "#10b981", color: "#000" }} onClick={() => handleApprove(w)} disabled={busy === w.id}>
                            {busy === w.id ? "..." : "Approve"}
                          </button>
                          <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => handleReject(w)} disabled={busy === w.id}>
                            Reject & Refund
                          </button>
                        </>
                      )}
                      <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12, color: "#ef4444" }} onClick={() => handleDelete(w.id)} disabled={busy === w.id}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 30 }}>No withdrawals found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
