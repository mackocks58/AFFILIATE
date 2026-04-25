import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { query, orderByChild, equalTo, onValue, ref } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  
  if (s === "completed" || s === "approved" || s === "success") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        APPROVED
      </div>
    );
  }
  
  if (s === "failed" || s === "rejected" || s === "error") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        REJECTED
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      PENDING
    </div>
  );
}

export default function WithdrawHistory() {
  const { user, userData } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWithdrawals([]);
      setLoading(false);
      return;
    }
    
    const wRef = ref(db, "withdrawals");
    const q = query(wRef, orderByChild("uid"), equalTo(user.uid));
    
    return onValue(q, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        list.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        setWithdrawals(list);
      } else {
        setWithdrawals([]);
      }
      setLoading(false);
    });
  }, [user]);

  const currency = userData?.country === "Zambia" ? "ZMW" : userData?.country === "Burundi" ? "BIF" : userData?.country === "Mozambique" ? "MZN" : userData?.country === "Congo" ? "CDF" : "TZS";

  const handleDownloadReceipt = () => {
    if (!selectedWithdrawal) return;
    
    const receiptContent = `
EAGLE STAR - WITHDRAWAL RECEIPT
===============================
Transaction ID : ${selectedWithdrawal.id}
Date & Time    : ${new Date(Number(selectedWithdrawal.timestamp)).toLocaleString()}
Amount         : ${selectedWithdrawal.amountFormatted || selectedWithdrawal.amount}
Status         : ${String(selectedWithdrawal.status).toUpperCase()}
Account Info   : ${selectedWithdrawal.accountDetails || selectedWithdrawal.method || "N/A"}
Wallet Used    : ${selectedWithdrawal.wallet || "Main Balance"}

Thank you for being part of EAGLE STAR!
===============================
    `.trim();

    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EagleStar_Receipt_${selectedWithdrawal.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#10b981" }}>💸</span> Withdrawal History
        </h1>
      </div>

      {!user && (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div className="alert info">Log in to see your withdrawal history.</div>
            <Link className="btn" to="/login" style={{ marginTop: 15 }}>Log in</Link>
          </div>
        </div>
      )}

      {user && (
        <div className="card" style={{ overflow: "hidden", border: "1px solid rgba(16, 185, 129, 0.2)", boxShadow: "0 10px 40px rgba(16, 185, 129, 0.05)" }}>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "rgba(5, 8, 22, 0.6)" }}>
                    <th style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>Date & Time</th>
                    <th style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>Status</th>
                    <th style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>Amount</th>
                    <th style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>Account Details</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr 
                      key={w.id} 
                      onClick={() => setSelectedWithdrawal(w)}
                      style={{ cursor: "pointer", transition: "background 0.2s" }}
                      className="hover-row"
                    >
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{new Date(Number(w.timestamp)).toLocaleString()}</td>
                      <td><StatusBadge status={String(w.status)} /></td>
                      <td style={{ fontWeight: 800, color: "var(--text)", fontSize: 14 }}>
                        {w.amountFormatted || `${w.amount} ${currency}`}
                      </td>
                      <td className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
                        {w.accountDetails || w.method || "N/A"}
                      </td>
                    </tr>
                  ))}
                  {!withdrawals.length && (
                    <tr>
                      <td colSpan={4} className="muted" style={{ textAlign: "center", padding: "60px 20px" }}>
                        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🏦</div>
                        You haven't requested any withdrawals yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <style>{`
            .hover-row:hover td {
              background: rgba(16, 185, 129, 0.05);
            }
          `}</style>
        </div>
      )}

      {/* Modern Receipt Modal */}
      {selectedWithdrawal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20
        }} onClick={() => setSelectedWithdrawal(null)}>
          <div 
            className="card" 
            style={{ 
              width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto",
              animation: "receiptPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              boxShadow: "0 30px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(16, 185, 129, 0.3)",
              background: "linear-gradient(180deg, rgba(5,8,22,1) 0%, rgba(11,18,36,1) 100%)",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "var(--text)" }}>Withdrawal Receipt</h3>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Eagle Star Official</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedWithdrawal(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, transition: "color 0.2s" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="card-body" style={{ padding: "24px" }}>
              {/* Giant Amount Display */}
              <div style={{ textAlign: "center", marginBottom: 30, padding: "24px 0", background: "rgba(16, 185, 129, 0.05)", borderRadius: 16, border: "1px dashed rgba(16, 185, 129, 0.2)" }}>
                <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Transaction Amount</div>
                <div style={{ fontSize: 38, fontWeight: 900, color: "#10b981", textShadow: "0 0 20px rgba(16,185,129,0.4)", letterSpacing: "-0.5px" }}>
                  {selectedWithdrawal.amountFormatted || `${selectedWithdrawal.amount} ${currency}`}
                </div>
                <div style={{ marginTop: 16 }}>
                  <StatusBadge status={String(selectedWithdrawal.status)} />
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px dashed rgba(255,255,255,0.1)", marginBottom: 12 }}>
                  <span className="muted" style={{ fontSize: 13 }}>Date & Time</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{new Date(Number(selectedWithdrawal.timestamp)).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px dashed rgba(255,255,255,0.1)", marginBottom: 12 }}>
                  <span className="muted" style={{ fontSize: 13 }}>Transaction ID</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>{selectedWithdrawal.id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px dashed rgba(255,255,255,0.1)", marginBottom: 12 }}>
                  <span className="muted" style={{ fontSize: 13 }}>Wallet Source</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", textTransform: "capitalize" }}>{selectedWithdrawal.wallet || "Main Balance"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted" style={{ fontSize: 13 }}>Destination Account</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text)", fontWeight: 700, textAlign: "right", maxWidth: "50%" }}>
                    {selectedWithdrawal.accountDetails || selectedWithdrawal.method || "N/A"}
                  </span>
                </div>
              </div>

              {/* Dynamic QR Code */}
              <div style={{ marginTop: 30, textAlign: "center" }}>
                <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Official Receipt Verification</div>
                <div style={{ background: "#fff", padding: 12, borderRadius: 12, display: "inline-block", boxShadow: "0 0 15px rgba(255,255,255,0.1)" }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=eagle-star-receipt-${selectedWithdrawal.id}`} 
                    alt="Receipt QR" 
                    style={{ width: 120, height: 120, display: "block" }} 
                  />
                </div>
              </div>

              {/* Download Button */}
              <button 
                className="btn breathe" 
                style={{ width: "100%", marginTop: 30, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff", border: "none", padding: "16px", borderRadius: 12, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 10px 20px rgba(16,185,129,0.3)" }}
                onClick={handleDownloadReceipt}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Receipt Text
              </button>
            </div>
            
            <style>{`
              @keyframes receiptPop {
                0% { opacity: 0; transform: translateY(40px) scale(0.9); }
                60% { opacity: 1; transform: translateY(-10px) scale(1.02); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
          </div>
        </div>
      )}
    </Shell>
  );
}
