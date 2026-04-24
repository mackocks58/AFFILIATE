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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const networkData: Record<string, { value: string, logo: string, domain: string }[]> = {
    "Tanzania": [
      { value: "M-Pesa (Vodacom)", logo: "https://logo.clearbit.com/vodacom.co.tz", domain: "vodacom.co.tz" },
      { value: "Tigo Pesa", logo: "https://logo.clearbit.com/tigo.co.tz", domain: "tigo.co.tz" },
      { value: "Airtel Money (TZ)", logo: "https://logo.clearbit.com/airtel.co.tz", domain: "airtel.co.tz" },
      { value: "Halopesa", logo: "https://logo.clearbit.com/halotel.co.tz", domain: "halotel.co.tz" }
    ],
    "Zambia": [
      { value: "MTN Mobile Money", logo: "https://logo.clearbit.com/mtn.zm", domain: "mtn.zm" },
      { value: "Airtel Money (ZM)", logo: "https://logo.clearbit.com/airtel.co.zm", domain: "airtel.co.zm" },
      { value: "Zamtel", logo: "https://logo.clearbit.com/zamtel.zm", domain: "zamtel.zm" }
    ],
    "Burundi": [
      { value: "EcoCash", logo: "https://logo.clearbit.com/econet.bi", domain: "econet.bi" },
      { value: "Lumicash", logo: "https://logo.clearbit.com/lumitel.bi", domain: "lumitel.bi" }
    ],
    "Mozambique": [
      { value: "M-Pesa (MZ)", logo: "https://logo.clearbit.com/vodacom.co.mz", domain: "vodacom.co.mz" },
      { value: "e-Mola", logo: "https://logo.clearbit.com/movitel.co.mz", domain: "movitel.co.mz" }
    ],
    "Congo": [
      { value: "M-Pesa (CD)", logo: "https://logo.clearbit.com/vodacom.cd", domain: "vodacom.cd" },
      { value: "Airtel Money (CD)", logo: "https://logo.clearbit.com/airtel.cd", domain: "airtel.cd" },
      { value: "Orange Money", logo: "https://logo.clearbit.com/orange.cd", domain: "orange.cd" }
    ]
  };

  const availableNetworks = networkData[userData?.country || "Tanzania"] || [{ value: "Bank Transfer", logo: "https://logo.clearbit.com/bank.com", domain: "bank.com" }];

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

      <div className="card" style={{ maxWidth: 500, margin: "0 auto", overflow: "visible" }}>
        <div className="card-body">
          {message.text && (
            <div className="alert" style={{ background: message.type === "success" ? "rgba(16,185,129,0.1)" : undefined, borderColor: message.type === "success" ? "var(--accent2)" : undefined, color: message.type === "success" ? "var(--accent2)" : undefined }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="grid" style={{ gap: 20 }}>
            <div className="field" style={{ position: "relative", zIndex: 10 }}>
              <label>Network / Bank Name</label>
              <div 
                className="input"
                style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(56, 189, 248, 0.2)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", position: "relative" }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {network ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <span>{network}</span>
                    <img 
                      src={availableNetworks.find(n => n.value === network)?.logo || "https://www.google.com/s2/favicons?domain=bank.com&sz=128"} 
                      alt={network} 
                      style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: 2 }}
                      onError={(e) => { e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${availableNetworks.find(n => n.value === network)?.domain || 'bank.com'}&sz=128`; e.currentTarget.onerror = null; }}
                    />
                  </div>
                ) : (
                  <span style={{ color: "var(--muted)", flex: 1 }}>Select your network...</span>
                )}
                <div style={{ transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              {dropdownOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#050816", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: 12, marginTop: 4, overflowY: "auto", overflowX: "hidden", maxHeight: 200, zIndex: 50, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                  {availableNetworks.map(n => (
                    <div 
                      key={n.value}
                      onClick={() => { setNetwork(n.value); setDropdownOpen(false); }}
                      style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: network === n.value ? "rgba(56, 189, 248, 0.15)" : "transparent" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(56, 189, 248, 0.25)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = network === n.value ? "rgba(56, 189, 248, 0.15)" : "transparent"}
                    >
                      <span>{n.value}</span>
                      <img 
                        src={n.logo} 
                        alt={n.value} 
                        style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: 2 }} 
                        onError={(e) => { e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${n.domain}&sz=128`; e.currentTarget.onerror = null; }}
                      />
                    </div>
                  ))}
                </div>
              )}
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



