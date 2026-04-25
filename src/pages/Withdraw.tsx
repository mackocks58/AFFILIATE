import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";
import { ref, get, push, update, serverTimestamp } from "firebase/database";
import { db } from "@/firebase";
import { Link } from "react-router-dom";

export default function Withdraw() {
  const { user, userData, exchangeRates } = useAuth();
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("balance");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeReferrals, setActiveReferrals] = useState(0);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  const walletOptions = [
    { id: "balance", label: "Main Balance", requiredReferrals: 0, field: "balance" },
    { id: "youtube", label: "YouTube Earnings", requiredReferrals: config?.requirements?.youtube ?? 50, field: "youtubeEarnings" },
    { id: "tiktok", label: "TikTok Earnings", requiredReferrals: config?.requirements?.tiktok ?? 500, field: "tiktokEarnings" },
    { id: "facebook", label: "Facebook Earnings", requiredReferrals: config?.requirements?.facebook ?? 100, field: "facebookEarnings" },
    { id: "quiz", label: "Quiz Earnings", requiredReferrals: config?.requirements?.quiz ?? 30, field: "quizEarnings" },
    { id: "bonus", label: "Registration Bonus", requiredReferrals: config?.requirements?.bonus ?? 30, field: "bonus" },
  ];

  useEffect(() => {
    if (!user || !userData?.affiliateCode) return;
    async function checkReferrals() {
      const refsSnap = await get(ref(db, `referrals/${userData.affiliateCode}`));
      if (refsSnap.exists()) {
        const refs = refsSnap.val();
        let count = 0;
        for (const uid of Object.keys(refs)) {
          const uSnap = await get(ref(db, `users/${uid}`));
          if (uSnap.exists() && uSnap.val().status === "active") {
            count++;
          }
        }
        setActiveReferrals(count);
      }
    }
    
    async function checkPendingWithdrawals() {
      try {
        const wSnap = await get(ref(db, "withdrawals"));
        if (wSnap.exists()) {
          const allW = wSnap.val();
          const pending = Object.values(allW).find((w: any) => w.uid === user.uid && w.status === "pending");
          if (pending) {
            setPendingRequest(pending);
          }
        }
      } catch (e) {
        console.error("Error checking pending withdrawals", e);
      }
    }

    async function fetchConfig() {
      try {
        const snap = await get(ref(db, "settings/withdrawals"));
        if (snap.exists()) {
          setConfig(snap.val());
        } else {
          setConfig({});
        }
      } catch (e) {
        console.error("Error fetching config", e);
        setConfig({});
      }
    }

    fetchConfig();
    checkReferrals();
    checkPendingWithdrawals();
  }, [user, userData]);

  if (!userData || config === null) return <Shell><div className="alert">Loading...</div></Shell>;

  const hasBoundAccount = !!userData.withdrawalDetails?.accountNumber;
  const currency = userData.country === "Zambia" ? "ZMW" : userData.country === "Burundi" ? "BIF" : userData.country === "Mozambique" ? "MZN" : userData.country === "Congo" ? "CDF" : "TZS";
  
  const rate = exchangeRates[userData.country] || 1;
  const baseMinWithdrawal = config?.minWithdrawal ?? 16000;
  const minWithdrawal = baseMinWithdrawal * rate;

  const selectedWalletOption = walletOptions.find(w => w.id === selectedWallet)!;
  const availableBalance = Number(userData[selectedWalletOption.field] || 0);
  const isUnlocked = activeReferrals >= selectedWalletOption.requiredReferrals;
  const maxWithdrawable = isUnlocked ? availableBalance : 0;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const reqAmount = Number(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return setMessage({ type: "error", text: "Invalid withdrawal amount." });
    }
    if (!isUnlocked) {
      return setMessage({ type: "error", text: `You need ${selectedWalletOption.requiredReferrals} active direct referrals to withdraw from ${selectedWalletOption.label}. You have ${activeReferrals}.` });
    }
    if (reqAmount < minWithdrawal) {
      return setMessage({ type: "error", text: `Minimum withdrawal amount is ${minWithdrawal.toLocaleString()} ${currency}` });
    }
    if (reqAmount > maxWithdrawable) {
      return setMessage({ type: "error", text: `Insufficient withdrawable funds in ${selectedWalletOption.label}.` });
    }
    if (password !== userData.withdrawalDetails.password) {
      return setMessage({ type: "error", text: "Incorrect withdrawal password." });
    }

    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const newBalance = availableBalance - reqAmount;

      // Record withdrawal request
      const withdrawRef = push(ref(db, `withdrawals`));
      
      // 1. Create the withdrawal document
      await set(withdrawRef, {
        uid: user.uid,
        amount: reqAmount,
        currency,
        status: "pending",
        details: userData.withdrawalDetails,
        walletField: selectedWalletOption.field,
        walletLabel: selectedWalletOption.label,
        createdAt: serverTimestamp()
      });

      // 2. Update the user's balance
      await update(ref(db, `users/${user.uid}`), {
        [selectedWalletOption.field]: newBalance
      });

      setMessage({ type: "success", text: "Withdrawal request submitted successfully. Pending admin approval." });
      setAmount("");
      setPassword("");
      setPendingRequest({
        amount: reqAmount,
        currency,
        status: "pending"
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to process withdrawal." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Withdraw Funds</h1>
          <p className="muted" style={{ margin: "5px 0 0" }}>Request a withdrawal to your bound account.</p>
        </div>
        <Link to="/withdraw-history" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          History
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
        <div className="card-body">
          {!hasBoundAccount ? (
            <div className="alert" style={{ textAlign: "center" }}>
              <p style={{ marginBottom: 16 }}>You have not bound a receiving account yet.</p>
              <Link to="/bind-account" className="btn">Bind Account Now</Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24, padding: 16, background: "rgba(16,185,129,0.1)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.3)" }}>
                <div style={{ fontSize: 13, color: "var(--accent)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Available in {selectedWalletOption.label}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text)" }}>
                  {availableBalance.toLocaleString()} <span style={{ fontSize: 16, opacity: 0.7 }}>{currency}</span>
                </div>
                {!isUnlocked && selectedWalletOption.requiredReferrals > 0 && (
                  <div style={{ fontSize: 12, marginTop: 8, color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "8px 12px", borderRadius: 8 }}>
                    <i className="fa-solid fa-lock" style={{ marginRight: 6 }}></i> Locked! You need {selectedWalletOption.requiredReferrals} active direct referrals. (You have {activeReferrals})
                  </div>
                )}
                {isUnlocked && selectedWalletOption.requiredReferrals > 0 && (
                  <div style={{ fontSize: 12, marginTop: 8, color: "#10b981" }}>
                    <i className="fa-solid fa-unlock" style={{ marginRight: 6 }}></i> Unlocked ({activeReferrals}/{selectedWalletOption.requiredReferrals} referrals met)
                  </div>
                )}
              </div>

              {message.text && (
                <div className="alert" style={{ marginBottom: 20, background: message.type === "success" ? "rgba(16,185,129,0.1)" : undefined, borderColor: message.type === "success" ? "var(--accent2)" : undefined, color: message.type === "success" ? "var(--accent2)" : undefined }}>
                  {message.text}
                </div>
              )}

              {pendingRequest ? (
                <div style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                  <h3 style={{ color: "#eab308", margin: "0 0 12px 0", fontSize: 18 }}>Request Processing</h3>
                  <p style={{ color: "var(--text)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
                    Your request of <strong>{Number(pendingRequest.amount).toLocaleString()} {pendingRequest.currency || currency}</strong> is currently processing. Please wait for it to be processed.
                  </p>
                  <p style={{ color: "var(--muted)", margin: "0 0 20px 0", fontSize: 14 }}>
                    If it takes too long, please contact your admin.
                  </p>
                  <a href="https://wa.me/254113062635" target="_blank" rel="noreferrer" className="btn" style={{ background: "#25D366", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Contact Admin on WhatsApp
                  </a>
                </div>
              ) : (
                <form onSubmit={handleWithdraw} className="grid" style={{ gap: 20 }}>
                  <div className="field">
                    <label>Wallet to Withdraw From</label>
                    <select 
                      className="select" 
                      value={selectedWallet} 
                      onChange={e => {
                        setSelectedWallet(e.target.value);
                        setAmount("");
                        setMessage({ type: "", text: "" });
                      }}
                    >
                      {walletOptions.map(w => (
                        <option key={w.id} value={w.id}>{w.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Amount to Withdraw ({currency})</label>
                    <input 
                      className="input" 
                      type="number" 
                      placeholder={`Min. ${minWithdrawal.toLocaleString()}`} 
                      value={amount} 
                      onChange={e => {
                        setAmount(e.target.value);
                        if (e.target.value && Number(e.target.value) < minWithdrawal) {
                           setMessage({ type: "error", text: `Minimum withdrawal is ${minWithdrawal.toLocaleString()} ${currency}` });
                        } else if (e.target.value && Number(e.target.value) > maxWithdrawable) {
                           setMessage({ type: "error", text: `Amount exceeds available balance.` });
                        } else {
                           setMessage({ type: "", text: "" });
                        }
                      }} 
                      max={maxWithdrawable}
                      required 
                    />
                  </div>

                  <div className="field">
                    <label>Withdrawal Password</label>
                    <input 
                      className="input" 
                      type="password" 
                      placeholder="Enter your withdrawal password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                    />
                  </div>

                  <button type="submit" className="btn" disabled={busy || maxWithdrawable <= 0} style={{ padding: 16 }}>
                    {busy ? "Processing..." : "Submit Withdrawal Request"}
                  </button>
                </form>
              )}

              <div className="card breathe" style={{ marginTop: 32, padding: 20, background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(5, 8, 22, 0.95))", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 16, position: "relative", overflow: "hidden", boxShadow: "0 8px 24px rgba(56, 189, 248, 0.1)" }}>
                <div style={{ position: "absolute", right: -20, top: -20, fontSize: 100, color: "var(--accent)", opacity: 0.05, transform: "rotate(-15deg)" }}>
                   <i className="fa-solid fa-building-columns"></i>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(56, 189, 248, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 18 }}>
                    <i className="fa-solid fa-wallet"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", fontWeight: 800 }}>Receiving Account</div>
                    <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>{userData.withdrawalDetails.network}</div>
                  </div>
                </div>
                
                <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 12, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Account Name</div>
                  <div style={{ fontSize: 16, color: "var(--text)", fontWeight: 700, marginBottom: 12 }}>{userData.withdrawalDetails.accountName}</div>
                  
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Account Number</div>
                  <div className="mono" style={{ fontSize: 18, color: "var(--accent)", fontWeight: 800, letterSpacing: "0.05em" }}>{userData.withdrawalDetails.accountNumber}</div>
                </div>

                <div style={{ marginTop: 16, textAlign: "right", position: "relative", zIndex: 1 }}>
                  <Link to="/bind-account" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <i className="fa-solid fa-pen-to-square"></i> Change Account
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}




