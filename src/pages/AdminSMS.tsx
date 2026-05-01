import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "@/firebase";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";

export function AdminSMS() {
  const [target, setTarget] = useState("tanzania");
  const [customPhones, setCustomPhones] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    const r = ref(db, "smsCampaigns");
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setCampaigns(list);
      } else {
        setCampaigns([]);
      }
    });
    return () => unsub();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }
    
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
      
      const res = await fetch(`${apiBaseUrl}/api/admin/send-bulk-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, message, target, customPhones })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send SMS");
      }
      
      setSuccess(`Success! Found ${data.totalFound} numbers. Submitted: ${data.submitted}, Failed: ${data.failed}.`);
      setMessage("");
      if (target === "custom") {
        setCustomPhones("");
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Failed to send SMS."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="card">
        <div className="card-body">
          <h2 style={{ marginTop: 0 }}>Send Bulk SMS</h2>
          
          {error && <div className="alert">{error}</div>}
          {success && <div className="alert info">{success}</div>}
          
          <form onSubmit={handleSend} className="grid" style={{ gap: 16 }}>
            <div className="field">
              <label>Target Audience</label>
              <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="tanzania">All Tanzanian Users (with numbers)</option>
                <option value="custom">Custom Phone Numbers</option>
              </select>
            </div>
            
            {target === "custom" && (
              <div className="field">
                <label>Phone Numbers (comma separated)</label>
                <textarea 
                  className="textarea" 
                  rows={3} 
                  placeholder="e.g. 0700111222, 0755333444" 
                  value={customPhones} 
                  onChange={(e) => setCustomPhones(e.target.value)} 
                  required 
                />
              </div>
            )}
            
            <div className="field">
              <label>Message Content</label>
              <textarea 
                className="textarea" 
                rows={4} 
                placeholder="Enter your SMS message here..." 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                required 
              />
              <div className="muted" style={{ fontSize: 12, marginTop: 4, textAlign: "right" }}>
                {message.length} characters
              </div>
            </div>
            
            <button type="submit" className="btn" disabled={busy} style={{ background: "#10b981", color: "#000", fontWeight: 700 }}>
              {busy ? "Sending..." : "Send SMS Campaign"}
            </button>
          </form>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <h2 style={{ margin: "20px" }}>Campaign History</h2>
          
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 20px" }}>Date</th>
                  <th style={{ padding: "12px 20px" }}>Target</th>
                  <th style={{ padding: "12px 20px" }}>Message</th>
                  <th style={{ padding: "12px 20px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(camp => (
                  <tr key={camp.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <td style={{ padding: "12px 20px" }} className="muted">
                      {new Date(camp.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 20px", textTransform: "capitalize" }}>
                      {camp.target}
                    </td>
                    <td style={{ padding: "12px 20px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {camp.message}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      {camp.success ? (
                        <span style={{ color: "#10b981" }}>Success ({camp.submittedCount} / {camp.totalTargets})</span>
                      ) : (
                        <span style={{ color: "#ef4444" }}>Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted" style={{ padding: "20px", textAlign: "center" }}>
                      No campaigns found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
