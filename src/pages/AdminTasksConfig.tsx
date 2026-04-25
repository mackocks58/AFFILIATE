import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/firebase";

export function AdminTasksConfig() {
  const [configs, setConfigs] = useState<any>({
    youtube: { allowedDays: [5], baseReward: 1000 },
    tiktok: { allowedDays: [2], baseReward: 800 },
    facebook: { allowedDays: [4], baseReward: 500 },
    quiz: { allowedDays: [3], baseReward: 300 }
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const DAYS = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" }
  ];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const snap = await get(ref(db, "settings/tasks"));
    if (snap.exists()) {
      setConfigs((prev: any) => ({ ...prev, ...snap.val() }));
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setMsg("");
    try {
      await set(ref(db, "settings/tasks"), configs);
      setMsg("Task configurations saved successfully!");
    } catch (e: any) {
      setMsg("Error saving configs: " + e.message);
    }
    setBusy(false);
  };

  const toggleDay = (taskKey: string, dayValue: number) => {
    setConfigs((prev: any) => {
      const currentDays = prev[taskKey].allowedDays || [];
      const newDays = currentDays.includes(dayValue)
        ? currentDays.filter((d: number) => d !== dayValue)
        : [...currentDays, dayValue];
      return {
        ...prev,
        [taskKey]: { ...prev[taskKey], allowedDays: newDays }
      };
    });
  };

  const setReward = (taskKey: string, val: string) => {
    setConfigs((prev: any) => ({
      ...prev,
      [taskKey]: { ...prev[taskKey], baseReward: Number(val) }
    }));
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2>Task Configuration</h2>
        <p className="muted">Control the days tasks are available and the base reward amount (in TZS).</p>

        {msg && <div className="alert" style={{ marginBottom: 16 }}>{msg}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.keys(configs).map(taskKey => {
            const config = configs[taskKey];
            return (
              <div key={taskKey} style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
                <h3 style={{ textTransform: "capitalize", margin: "0 0 12px", color: "var(--accent)" }}>{taskKey} Task</h3>
                
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Base Reward Amount (TZS equivalent)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={config.baseReward} 
                    onChange={e => setReward(taskKey, e.target.value)} 
                  />
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Note: Other currencies are scaled automatically based on this value.</p>
                </div>

                <div className="field">
                  <label>Allowed Days</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {DAYS.map(d => {
                      const isSelected = config.allowedDays?.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          onClick={() => toggleDay(taskKey, d.value)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: isSelected ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.2)",
                            background: isSelected ? "rgba(16, 185, 129, 0.2)" : "transparent",
                            color: isSelected ? "var(--accent)" : "var(--muted)",
                            cursor: "pointer"
                          }}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          className="btn" 
          onClick={handleSave} 
          disabled={busy}
          style={{ marginTop: 24, width: "100%", background: "#38bdf8", color: "#000", fontWeight: "bold" }}
        >
          {busy ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
