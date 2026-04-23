import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";
import { ref, get, push, update, serverTimestamp } from "firebase/database";
import { db } from "@/firebase";
import { Link } from "react-router-dom";

export default function Withdraw() {
  const { user, userData } = useAuth();
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeReferrals, setActiveReferrals] = useState(0);

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
    checkReferrals();
  }, [user, userData]);

  if (!userData) return <Shell><div className="alert">Loading...</div></Shell>;

  const hasBoundAccount = !!userData.withdrawalDetails?.accountNumber;
  const bonusUnlocked = activeReferrals >= 30;
  const availableBalance = Number(userData.balance || 0);
  const bonusBalance = Number(userData.bonus || 0);
  const maxWithdrawable = availableBalance + (bonusUnlocked ? bonusBalance : 0);
  const currency = userData.country === "Zambia" ? "ZMW" : userData.country === "Burundi" ? "BIF" : "TZS";

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const reqAmount = Number(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return setMessage({ type: "error", text: "Invalid withdrawal amount." });
    }
    if (reqAmount > maxWithdrawable) {
      return setMessage({ type: "error", text: `Insufficient withdrawable funds. Max available: ${maxWithdrawable.toLocaleString()} ${currency}` });
    }
    if (password !== userData.withdrawalDetails.password) {
      return setMessage({ type: "error", text: "Incorrect withdrawal password." });
    }

    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      // Deduct from balance first, then from bonus if needed
      let newBalance = availableBalance;
      let newBonus = bonusBalance;
      let amountToDeduct = reqAmount;

      if (amountToDeduct <= newBalance) {
        newBalance -= amountToDeduct;
      } else {
        const remainder = amountToDeduct - newBalance;
        newBalance = 0;
        newBonus -= remainder;
      }

      // Record withdrawal request
      const withdrawRef = push(ref(db, `withdrawals`));
      await update(ref(db), {
        [`users/${user.uid}/balance`]: newBalance,
        [`users/${user.uid}/bonus`]: newBonus,
        [`withdrawals/${withdrawRef.key}`]: {
          uid: user.uid,
          amount: reqAmount,
          currency,
          status: "pending",
          details: userData.withdrawalDetails,
          createdAt: serverTimestamp()
        }
      });

      setMessage({ type: "success", text: "Withdrawal request submitted successfully. Pending admin approval." });
      setAmount("");
      setPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to process withdrawal." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Withdraw Funds</h1>
        <p className="muted">Request a withdrawal to your bound account.</p>
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
                <div style={{ fontSize: 13, color: "var(--accent)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Withdrawable Balance</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text)" }}>
                  {maxWithdrawable.toLocaleString()} <span style={{ fontSize: 16, opacity: 0.7 }}>{currency}</span>
                </div>
                {!bonusUnlocked && bonusBalance > 0 && (
                  <div style={{ fontSize: 12, marginTop: 8, color: "rgba(255,255,255,0.6)" }}>
                    Bonus of {bonusBalance.toLocaleString()} {currency} locked. Need {30 - activeReferrals} more active direct referrals.
                  </div>
                )}
              </div>

              {message.text && (
                <div className="alert" style={{ marginBottom: 20, background: message.type === "success" ? "rgba(16,185,129,0.1)" : undefined, borderColor: message.type === "success" ? "var(--accent2)" : undefined, color: message.type === "success" ? "var(--accent2)" : undefined }}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleWithdraw} className="grid" style={{ gap: 20 }}>
                <div className="field">
                  <label>Amount to Withdraw ({currency})</label>
                  <input 
                    className="input" 
                    type="number" 
                    placeholder="Enter amount" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
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

              <div style={{ marginTop: 24, fontSize: 13, color: "var(--muted)", background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 8 }}>
                <strong>Receiving Account:</strong><br />
                {userData.withdrawalDetails.network} - {userData.withdrawalDetails.accountNumber}<br />
                ({userData.withdrawalDetails.accountName})
                <div style={{ marginTop: 8 }}>
                  <Link to="/bind-account" style={{ color: "var(--accent)", textDecoration: "underline" }}>Change account details</Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}




