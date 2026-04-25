import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/firebase";
import Swal from "sweetalert2";

export function AdminWithdrawConfig() {
  const [minWithdrawal, setMinWithdrawal] = useState(16000);
  const [requirements, setRequirements] = useState({
    youtube: 50,
    tiktok: 500,
    facebook: 100,
    quiz: 30,
    bonus: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await get(ref(db, "settings/withdrawals"));
        if (snap.exists()) {
          const data = snap.val();
          if (data.minWithdrawal !== undefined) setMinWithdrawal(data.minWithdrawal);
          if (data.requirements) {
            setRequirements(prev => ({ ...prev, ...data.requirements }));
          }
        }
      } catch (err) {
        console.error("Failed to load withdrawal config", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set(ref(db, "settings/withdrawals"), {
        minWithdrawal,
        requirements
      });
      Swal.fire({
        background: '#111b33', color: '#fff', confirmButtonColor: '#38bdf8',
        icon: 'success', title: 'Saved!', text: 'Withdrawal configurations have been updated.'
      });
    } catch (err: any) {
      Swal.fire({
        background: '#111b33', color: '#fff', confirmButtonColor: '#38bdf8',
        icon: 'error', title: 'Error', text: err.message || 'Failed to save configuration.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReqChange = (key: keyof typeof requirements, val: string) => {
    setRequirements(prev => ({ ...prev, [key]: Number(val) }));
  };

  if (loading) return <div style={{ padding: 20 }}>Loading config...</div>;

  return (
    <div className="card">
      <div className="card-body">
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>Withdrawal Configuration</h2>
        
        <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--accent)" }}>Global Settings</h3>
          <div className="field" style={{ maxWidth: 300 }}>
            <label>Base Minimum Withdrawal Amount (TZS)</label>
            <input 
              type="number" 
              className="input" 
              value={minWithdrawal} 
              onChange={e => setMinWithdrawal(Number(e.target.value))} 
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>This will automatically convert for other currencies based on exchange rates.</p>
          </div>
        </div>

        <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, color: "#10b981" }}>Active Direct Referral Requirements</h3>
          <p className="muted" style={{ marginBottom: 20 }}>Set how many active direct referrals a user needs to unlock withdrawals for specific wallets. Main Balance requires 0.</p>
          
          <div className="grid" style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="field">
              <label>YouTube Earnings</label>
              <input type="number" className="input" value={requirements.youtube} onChange={e => handleReqChange('youtube', e.target.value)} />
            </div>
            <div className="field">
              <label>TikTok Earnings</label>
              <input type="number" className="input" value={requirements.tiktok} onChange={e => handleReqChange('tiktok', e.target.value)} />
            </div>
            <div className="field">
              <label>Facebook Earnings</label>
              <input type="number" className="input" value={requirements.facebook} onChange={e => handleReqChange('facebook', e.target.value)} />
            </div>
            <div className="field">
              <label>Quiz Earnings</label>
              <input type="number" className="input" value={requirements.quiz} onChange={e => handleReqChange('quiz', e.target.value)} />
            </div>
            <div className="field">
              <label>Registration Bonus</label>
              <input type="number" className="input" value={requirements.bonus} onChange={e => handleReqChange('bonus', e.target.value)} />
            </div>
          </div>
        </div>

        <button className="btn breathe" onClick={handleSave} disabled={saving} style={{ padding: "12px 32px", fontSize: 16 }}>
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
