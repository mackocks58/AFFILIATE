import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";
import { ref, update, get } from "firebase/database";
import { db } from "@/firebase";

export default function BindAccount() {
  const { user, userData } = useAuth();
  const [network, setNetwork] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (userData?.withdrawalDetails) {
      setNetwork(userData.withdrawalDetails.network || "");
      setAccountNumber(userData.withdrawalDetails.accountNumber || "");
      setAccountName(userData.withdrawalDetails.accountName || "");
      // Not populating password for security
    }
  }, [userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      if (withdrawPassword.length < 4) {
        throw new Error("Withdrawal password must be at least 4 characters.");
      }

      await update(ref(db, `users/${user.uid}/withdrawalDetails`), {
        network,
        accountNumber,
        accountName,
        password: withdrawPassword
      });

      setMessage({ type: "success", text: "Account details and password bound successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save details." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Bind Withdrawal Account</h1>
        <p className="muted">Secure your funds by binding your receiving account details.</p>
      </div>

      <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
        <div className="card-body">
          {message.text && (
            <div className="alert" style={{ background: message.type === "success" ? "rgba(16,185,129,0.1)" : undefined, borderColor: message.type === "success" ? "var(--accent2)" : undefined, color: message.type === "success" ? "var(--accent2)" : undefined }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="grid" style={{ gap: 20 }}>
            <div className="field">
              <label>Network / Bank Name</label>
              <select 
                className="select" 
                value={network} 
                onChange={e => setNetwork(e.target.value)} 
                required 
              >
                <option value="" disabled>Select your network...</option>
                <optgroup label="Tanzania">
                  <option value="M-Pesa (Vodacom)">M-Pesa (Vodacom)</option>
                  <option value="Tigo Pesa">Tigo Pesa</option>
                  <option value="Airtel Money (TZ)">Airtel Money (TZ)</option>
                  <option value="Halopesa">Halopesa</option>
                </optgroup>
                <optgroup label="Zambia">
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Airtel Money (ZM)">Airtel Money (ZM)</option>
                  <option value="Zamtel">Zamtel</option>
                </optgroup>
                <optgroup label="Burundi">
                  <option value="EcoCash">EcoCash</option>
                  <option value="Lumicash">Lumicash</option>
                </optgroup>
                <optgroup label="Mozambique">
                  <option value="M-Pesa (MZ)">M-Pesa (MZ)</option>
                  <option value="e-Mola">e-Mola</option>
                </optgroup>
                <optgroup label="Congo">
                  <option value="M-Pesa (CD)">M-Pesa (CD)</option>
                  <option value="Airtel Money (CD)">Airtel Money (CD)</option>
                  <option value="Orange Money">Orange Money</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="Bank Transfer">Bank Transfer</option>
                </optgroup>
              </select>
            </div>
            
            <div className="field">
              <label>Account Number / Phone Number</label>
              <input 
                className="input" 
                placeholder="Your receiving number" 
                value={accountNumber} 
                onChange={e => setAccountNumber(e.target.value)} 
                required 
              />
            </div>
            
            <div className="field">
              <label>Account Holder Name</label>
              <input 
                className="input" 
                placeholder="Name exactly as it appears on account" 
                value={accountName} 
                onChange={e => setAccountName(e.target.value)} 
                required 
              />
            </div>

            <div className="field">
              <label>Withdrawal Password</label>
              <input 
                className="input" 
                type="password" 
                placeholder="Set a secure password for withdrawals" 
                value={withdrawPassword} 
                onChange={e => setWithdrawPassword(e.target.value)} 
                required 
              />
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>You will need this password every time you withdraw.</p>
            </div>

            <button type="submit" className="btn" disabled={busy} style={{ padding: 16, background: "var(--accent)", color: "#fff", border: "none" }}>
              {busy ? "Saving..." : (userData?.withdrawalDetails ? "Update Details" : "Bind Details")}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}



