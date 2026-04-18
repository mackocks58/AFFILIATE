import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { onValue, push, ref, remove, set, update } from "firebase/database";
import { db, storage } from "@/firebase";
import type { Betslip, BetslipResult } from "@/types";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { BETTING_COMPANIES } from "@/lib/companies";
import { resultSymbol } from "@/lib/stats";
import { storagePathFromDownloadUrl } from "@/lib/storagePath";
import { AdminMatches } from "./AdminMatches";

type Row = Betslip & { id: string };

function toDatetimeLocalValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function Admin() {
  const { user, isAdmin, refreshClaims } = useAuth();
  const [rows, setRows] = useState<Record<string, Betslip> | null>(null);

  const [company, setCompany] = useState<string>(BETTING_COMPANIES[0]);
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("5000");
  const [currency, setCurrency] = useState("TZS");
  const [expiresAtLocal, setExpiresAtLocal] = useState(() => toDatetimeLocalValue(Date.now() + 86400000));
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const r = ref(db, "betslips");
    return onValue(r, (snap) => setRows(snap.val() as Record<string, Betslip> | null));
  }, []);

  const list = useMemo(() => {
    if (!rows) return [];
    return Object.entries(rows)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [rows]);

  async function createSlip(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await refreshClaims();
      if (!file) throw new Error("Choose an image for the betslip.");
      const expiresAt = new Date(expiresAtLocal).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new Error("Expiration must be in the future.");
      }

      const key = push(ref(db, "betslips")).key;
      if (!key) throw new Error("Could not allocate betslip id.");

      const reader = new FileReader();
      const imageUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
      });

      await set(ref(db, `betslips/${key}`), {
        company,
        title: title.trim(),
        cost: Number(cost),
        currency: currency.trim() || "TZS",
        imageUrl,
        expiresAt,
        result: "pending" satisfies BetslipResult,
        settledAt: null,
        createdAt: Date.now(),
        createdBy: user.uid,
      });

      await set(ref(db, `betslipCodes/${key}`), { code: code.trim() });

      setMsg("Betslip created.");
      setTitle("");
      setCode("");
      setFile(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create betslip.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSlip(id: string, imageUrl: string) {
    if (!confirm("Delete this betslip permanently?")) return;
    setErr(null);
    setMsg(null);
    try {
      await remove(ref(db, `betslips/${id}`));
      await remove(ref(db, `betslipCodes/${id}`));
      const p = storagePathFromDownloadUrl(imageUrl);
      if (p) {
        try {
          await deleteObject(storageRef(storage, p));
        } catch {
          // ignore storage delete failures (rules / missing file)
        }
      }
      setMsg("Deleted.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  async function updateResult(id: string, next: BetslipResult) {
    setErr(null);
    setMsg(null);
    try {
      const settledAt = next === "pending" ? null : Date.now();
      await update(ref(db, `betslips/${id}`), { result: next, settledAt });
      setMsg("Updated result.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update.");
    }
  }

  async function updateExpiry(id: string, local: string) {
    const expiresAt = new Date(local).getTime();
    if (!Number.isFinite(expiresAt)) return;
    setErr(null);
    setMsg(null);
    try {
      await update(ref(db, `betslips/${id}`), { expiresAt });
      setMsg("Updated expiry.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update expiry.");
    }
  }

  async function updateCost(id: string, nextCost: string) {
    const n = Number(nextCost);
    if (!Number.isFinite(n) || n <= 0) return;
    setErr(null);
    setMsg(null);
    try {
      await update(ref(db, `betslips/${id}`), { cost: n });
      setMsg("Updated cost.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update cost.");
    }
  }

  if (!user) {
    return (
      <Shell>
        <div className="alert">
          Log in as an admin user. <Link to="/login">Log in</Link>
        </div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <h1 className="page-title">Admin</h1>
        <div className="card">
          <div className="card-body">
            <div className="alert">This account does not have the admin privilege.</div>
            <p className="muted" style={{ marginTop: 10 }}>
              Grant the Firebase Auth custom claim <span className="mono">admin: true</span> for your user, then sign
              out and sign back in.
            </p>
            <button className="btn btn-ghost" type="button" onClick={() => void refreshClaims()}>
              Refresh session
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const [tab, setTab] = useState<"betslips" | "matches">("betslips");

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Admin Panel</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className={`btn ${tab === "betslips" ? "" : "btn-ghost"}`} onClick={() => setTab("betslips")}>
            Betslips
          </button>
          <button className={`btn ${tab === "matches" ? "" : "btn-ghost"}`} onClick={() => setTab("matches")}>
            Matches
          </button>
        </div>
      </div>

      {tab === "betslips" ? (
        <div className="split">
          <div className="card">
            <div className="card-body">
              <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Create betslip</h2>
              {msg && <div className="alert info" style={{ marginBottom: 10 }}>{msg}</div>}
              {err && <div className="alert" style={{ marginBottom: 10 }}>{err}</div>}
              <form className="grid" style={{ gap: 12 }} onSubmit={createSlip}>
                <div className="field">
                  <label>Company</label>
                  <select className="select" value={company} onChange={(e) => setCompany(e.target.value)}>
                    {BETTING_COMPANIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="t">Title</label>
                  <input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label htmlFor="cost">Cost</label>
                    <input id="cost" className="input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} required />
                  </div>
                  <div className="field" style={{ width: 140 }}>
                    <label htmlFor="cur">Currency</label>
                    <input id="cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="exp">Expiration (local time)</label>
                  <input
                    id="exp"
                    className="input"
                    type="datetime-local"
                    value={expiresAtLocal}
                    onChange={(e) => setExpiresAtLocal(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="img">Betslip image</label>
                  <input id="img" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <div className="field">
                  <label htmlFor="code">Booking code (private)</label>
                  <textarea id="code" className="textarea" value={code} onChange={(e) => setCode(e.target.value)} required />
                </div>
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "Publishing…" : "Publish betslip"}
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Betslip</th>
                    <th>Cost</th>
                    <th>Expiry</th>
                    <th>Result</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <AdminRow key={b.id} slip={b} onDelete={() => void deleteSlip(b.id, b.imageUrl)} onResult={(r) => void updateResult(b.id, r)} onExpiry={(v) => void updateExpiry(b.id, v)} onCost={(v) => void updateCost(b.id, v)} />
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={5} className="muted">
                        No betslips yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <AdminMatches />
      )}
    </Shell>
  );
}

function AdminRow({
  slip,
  onDelete,
  onResult,
  onExpiry,
  onCost,
}: {
  slip: Row;
  onDelete: () => void;
  onResult: (r: BetslipResult) => void;
  onExpiry: (local: string) => void;
  onCost: (cost: string) => void;
}) {
  const [localExpiry, setLocalExpiry] = useState(() => toDatetimeLocalValue(Number(slip.expiresAt)));
  const [localCost, setLocalCost] = useState(String(slip.cost));

  useEffect(() => {
    setLocalExpiry(toDatetimeLocalValue(Number(slip.expiresAt)));
    setLocalCost(String(slip.cost));
  }, [slip.expiresAt, slip.cost]);

  const expired = Date.now() > Number(slip.expiresAt);

  return (
    <tr>
      <td>
        <div className="row" style={{ gap: 10 }}>
          <img src={slip.imageUrl} alt="" style={{ width: 92, borderRadius: 12, objectFit: "cover", aspectRatio: "16/10" }} />
          <div>
            <div style={{ fontWeight: 650 }}>{slip.title}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {slip.company}
              {expired ? " · expired" : ""}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link className="btn btn-ghost" to={`/slip/${slip.id}`}>
                Open
              </Link>
            </div>
          </div>
        </div>
      </td>
      <td>
        <input className="input" value={localCost} onChange={(e) => setLocalCost(e.target.value)} />
        <button className="btn btn-ghost" type="button" style={{ marginTop: 8 }} onClick={() => onCost(localCost)}>
          Save cost
        </button>
      </td>
      <td>
        <input className="input" type="datetime-local" value={localExpiry} onChange={(e) => setLocalExpiry(e.target.value)} />
        <button className="btn btn-ghost" type="button" style={{ marginTop: 8 }} onClick={() => onExpiry(localExpiry)}>
          Save expiry
        </button>
      </td>
      <td>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="pill mono" style={{ fontSize: 16 }}>
            {slip.result === "pending" ? "…" : resultSymbol(slip.result)}
          </span>
          <select className="select" value={slip.result} onChange={(e) => onResult(e.target.value as BetslipResult)}>
            <option value="pending">Pending</option>
            <option value="won">Won (✅)</option>
            <option value="lost">Lost (X)</option>
          </select>
        </div>
      </td>
      <td style={{ width: 120 }}>
        <button className="btn btn-danger" type="button" onClick={onDelete}>
          Delete
        </button>
      </td>
    </tr>
  );
}
