import { useEffect, useState } from "react";
import { onValue, ref, remove, update } from "firebase/database";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/apiBase";
import Swal from "sweetalert2";

const darkSwal = Swal.mixin({
  background: '#111b33',
  color: '#fff',
  confirmButtonColor: '#38bdf8',
  cancelButtonColor: '#ef4444'
});

export function AdminManualPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    const r = ref(db, "manualPayments");
    return onValue(r, snap => {
      if (!snap.exists()) return setPayments([]);
      const vals = snap.val();
      const arr = Object.entries(vals).map(([id, data]: any) => ({ id, ...data }));
      arr.sort((a, b) => b.timestamp - a.timestamp);
      setPayments(arr);
    });
  }, []);

  const filtered = payments.filter(p => filter === "all" || p.status === filter);

  async function handleApprove(id: string) {
    const result = await darkSwal.fire({
      title: 'Approve Payment?',
      text: "This will activate the user and process multi-level commissions.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Approve'
    });
    if (!result.isConfirmed) return;

    setBusy(id);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(apiUrl("/api/admin/manual-payments/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, paymentId: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      darkSwal.fire('Approved!', 'The payment was verified and commissions distributed.', 'success');
    } catch (e: any) {
      darkSwal.fire('Error', e.message, 'error');
    }
    setBusy(null);
  }

  async function handleReject(id: string) {
    const result = await darkSwal.fire({
      title: 'Reject Payment?',
      text: "This will mark the payment as rejected.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reject',
      confirmButtonColor: '#ef4444'
    });
    if (!result.isConfirmed) return;

    setBusy(id);
    try {
      await update(ref(db, `manualPayments/${id}`), { status: "rejected" });
      darkSwal.fire('Rejected', 'The payment was marked as rejected.', 'success');
    } catch (e: any) {
      darkSwal.fire('Error', e.message, 'error');
    }
    setBusy(null);
  }

  async function handleDelete(id: string) {
    const result = await darkSwal.fire({
      title: 'Delete Record?',
      text: "Permanently delete this record? This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444'
    });
    if (!result.isConfirmed) return;

    setBusy(id);
    try {
      await remove(ref(db, `manualPayments/${id}`));
      darkSwal.fire('Deleted!', 'Record removed.', 'success');
    } catch (e: any) {
      darkSwal.fire('Error', e.message, 'error');
    }
    setBusy(null);
  }

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Manual Payments</h2>
          <select className="select" style={{ width: 150 }} value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sender Details</th>
                <th>Amount</th>
                <th>Proof</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(p.timestamp).toLocaleString()}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="muted">{p.phone} ({p.country})</div>
                  </td>
                  <td><strong style={{ color: "var(--accent)" }}>{p.amount}</strong></td>
                  <td>
                    {p.screenshot ? (
                      <a href={p.screenshot} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "rgba(56,189,248,0.1)", padding: "4px 8px", borderRadius: 4, color: "#38bdf8", textDecoration: "none", fontSize: 12 }}>
                        View Proof
                      </a>
                    ) : <span className="muted">-</span>}
                  </td>
                  <td>
                    <span className={`pill ${p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "warning"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8, whiteSpace: "nowrap" }}>
                    {p.status === "pending" && (
                      <>
                        <button className="btn" style={{ padding: "4px 8px", fontSize: 12, background: "#10b981", color: "#000" }} onClick={() => handleApprove(p.id)} disabled={busy === p.id}>
                          {busy === p.id ? "..." : "Approve"}
                        </button>
                        <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => handleReject(p.id)} disabled={busy === p.id}>
                          Reject
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12, color: "#ef4444" }} onClick={() => handleDelete(p.id)} disabled={busy === p.id}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 30 }}>No manual payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
