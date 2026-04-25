import { useState, useEffect, useMemo } from "react";
import { ref, onValue, push, set, remove } from "firebase/database";
import { db } from "@/firebase";
import type { AppNotification } from "@/types";

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const r = ref(db, "notifications");
    return onValue(r, (snap) => {
      const data = snap.val() as Record<string, AppNotification> | null;
      if (data) {
        setNotifications(
          Object.entries(data)
            .map(([id, val]) => ({ ...val, id }))
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      } else {
        setNotifications([]);
      }
    });
  }, []);

  async function createNotification(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (!title.trim() || !message.trim()) {
        throw new Error("Title and message are required.");
      }

      const key = push(ref(db, "notifications")).key;
      if (!key) throw new Error("Could not allocate notification id.");

      let imageUrl = "";
      if (file) {
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image file"));
          reader.readAsDataURL(file);
        });
      }

      await set(ref(db, `notifications/${key}`), {
        title: title.trim(),
        message: message.trim(),
        imageUrl,
        createdAt: Date.now(),
      } satisfies AppNotification);

      setMsg("Notification published.");
      setTitle("");
      setMessage("");
      setFile(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create notification.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNotification(id: string) {
    if (!confirm("Delete this notification?")) return;
    setErr(null);
    setMsg(null);
    try {
      await remove(ref(db, `notifications/${id}`));
      setMsg("Deleted.");
    } catch (e: unknown) {
      setErr(getFriendlyErrorMessage(e, "Could not delete."));
    }
  }

  return (
    <div className="split">
      <div className="card">
        <div className="card-body">
          <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Send Notification</h2>
          {msg && <div className="alert info" style={{ marginBottom: 10 }}>{msg}</div>}
          {err && <div className="alert" style={{ marginBottom: 10 }}>{err}</div>}
          <form className="grid" style={{ gap: 12 }} onSubmit={createNotification}>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea id="message" className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="img">Image (Optional)</label>
              <input id="img" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Publishing…" : "Publish Notification"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Notification</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      {n.imageUrl && <img src={n.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />}
                      <div>
                        <div style={{ fontWeight: 600 }}>{n.title}</div>
                        <div className="muted" style={{ fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 200 }}>
                          {n.message}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ width: 80 }}>
                    <button className="btn btn-ghost" style={{ color: "var(--danger)" }} type="button" onClick={() => void deleteNotification(n.id!)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!notifications.length && (
                <tr>
                  <td colSpan={3} className="muted">
                    No notifications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
