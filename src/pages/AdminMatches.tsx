import { useEffect, useMemo, useState } from "react";
import { onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "@/firebase";
import { Match } from "./Home";

export function AdminMatches() {
  const [rows, setRows] = useState<Record<string, Match> | null>(null);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeLogo, setHomeLogo] = useState("");
  const [awayLogo, setAwayLogo] = useState("");
  const [time, setTime] = useState("");
  const [league, setLeague] = useState("");
  const [status, setStatus] = useState("Upcoming");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const r = ref(db, "matches");
    return onValue(r, (snap) => setRows(snap.val() as Record<string, Match> | null));
  }, []);

  const list = useMemo(() => {
    if (!rows) return [];
    return Object.entries(rows)
      .map(([id, v]) => ({ ...v, id }))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [rows]);

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const key = push(ref(db, "matches")).key;
      if (!key) throw new Error("Could not allocate match id.");

      await set(ref(db, `matches/${key}`), {
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        homeLogo: homeLogo.trim(),
        awayLogo: awayLogo.trim(),
        time: time.trim(),
        league: league.trim(),
        status: status.trim(),
        createdAt: Date.now(),
      });

      setMsg("Match created.");
      setHomeTeam("");
      setAwayTeam("");
      setHomeLogo("");
      setAwayLogo("");
      setTime("");
      setLeague("");
      setStatus("Upcoming");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create match.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMatch(id: string) {
    if (!confirm("Delete this match permanently?")) return;
    setErr(null);
    setMsg(null);
    try {
      await remove(ref(db, `matches/${id}`));
      setMsg("Match deleted.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not delete match.");
    }
  }

  async function updateMatchField(id: string, field: string, value: string) {
    setErr(null);
    setMsg(null);
    try {
      await update(ref(db, `matches/${id}`), { [field]: value });
      setMsg(`Updated ${field}.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update.");
    }
  }

  return (
    <div className="split">
      <div className="card">
        <div className="card-body">
          <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Create Match</h2>
          {msg && <div className="alert info" style={{ marginBottom: 10 }}>{msg}</div>}
          {err && <div className="alert" style={{ marginBottom: 10 }}>{err}</div>}
          <form className="grid" style={{ gap: 12 }} onSubmit={createMatch}>
            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Home Team</label>
                <input className="input" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} required />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Away Team</label>
                <input className="input" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} required />
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Home Logo URL</label>
                <input className="input" type="url" value={homeLogo} onChange={(e) => setHomeLogo(e.target.value)} required placeholder="https://..." />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Away Logo URL</label>
                <input className="input" type="url" value={awayLogo} onChange={(e) => setAwayLogo(e.target.value)} required placeholder="https://..." />
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Time (e.g. 22:00)</label>
                <input className="input" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>League</label>
                <input className="input" value={league} onChange={(e) => setLeague(e.target.value)} required />
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <input className="input" value={status} onChange={(e) => setStatus(e.target.value)} required placeholder="Upcoming, Live - 45', FT" />
            </div>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Publishing…" : "Publish Match"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Time / Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 650 }}>{m.homeTeam} vs {m.awayTeam}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{m.league}</div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <input className="input" style={{ width: 80, padding: 4 }} value={m.time} onChange={(e) => updateMatchField(m.id, "time", e.target.value)} />
                      <input className="input" style={{ width: 100, padding: 4 }} value={m.status} onChange={(e) => updateMatchField(m.id, "status", e.target.value)} />
                    </div>
                  </td>
                  <td style={{ width: 80 }}>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteMatch(m.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={3} className="muted">No matches yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
