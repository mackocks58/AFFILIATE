import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/firebase";

export function AdminRatesConfig() {
  const [rates, setRates] = useState<any>({
    Tanzania: 1,
    Zambia: 0.0105,
    Burundi: 1.15,
    Mozambique: 0.02666,
    Congo: 1
  });
  
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    const snap = await get(ref(db, "settings/exchangeRates"));
    if (snap.exists()) {
      setRates((prev: any) => ({ ...prev, ...snap.val() }));
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setMsg("");
    try {
      await set(ref(db, "settings/exchangeRates"), rates);
      setMsg("Exchange rates saved successfully!");
    } catch (e: any) {
      setMsg("Error saving exchange rates: " + e.message);
    }
    setBusy(false);
  };

  const setRate = (country: string, val: string) => {
    setRates((prev: any) => ({
      ...prev,
      [country]: Number(val)
    }));
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2>Exchange Rates Configuration</h2>
        <p className="muted">Set the multiplier rate for each country relative to 1 TZS. (e.g. if 15000 TZS = 157.5 ZMW, rate is 157.5 / 15000 = 0.0105)</p>

        {msg && <div className="alert" style={{ marginBottom: 16 }}>{msg}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.keys(rates).map(country => {
            return (
              <div key={country} style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
                <h3 style={{ textTransform: "capitalize", margin: "0 0 12px", color: "var(--accent)" }}>{country} Rate</h3>
                
                <div className="field">
                  <input 
                    type="number" 
                    className="input" 
                    value={rates[country]} 
                    step="0.00001"
                    onChange={e => setRate(country, e.target.value)} 
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button 
          className="btn" 
          onClick={handleSave} 
          disabled={busy}
          style={{ marginTop: 24, width: "100%", background: "#a855f7", color: "#000", fontWeight: "bold" }}
        >
          {busy ? "Saving..." : "Save Exchange Rates"}
        </button>
      </div>
    </div>
  );
}
