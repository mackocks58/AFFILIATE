import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { push, ref, serverTimestamp, set } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

export default function Support() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const email = useMemo(() => user?.email ?? "", [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const ticketRef = push(ref(db, `supportTickets/${user.uid}`));
      await set(ticketRef, {
        uid: user.uid,
        email,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      setDone("Ticket submitted. Our team will follow up by email.");
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not submit ticket.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="page-title">Customer support</h1>
      <div className="split">
        <div className="card">
          <div className="card-body">
            <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Contact</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              For payment issues, include your phone number and approximate payment time. For betslip access issues,
              include the betslip title.
            </p>
            <div className="grid" style={{ marginTop: 14, gap: 10 }}>
              <div className="pill">Email: {email || "—"}</div>
              <div className="pill">Hours: Mon–Sun, 09:00–21:00 (EAT)</div>
              <div className="pill">Typical response: under 24 hours</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {!user && (
              <div className="alert">
                Log in to open a support ticket. <Link to="/login">Log in</Link>
              </div>
            )}

            {user && (
              <form className="grid" style={{ gap: 12 }} onSubmit={submit}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Open a ticket</h2>
                {done && <div className="alert info">{done}</div>}
                {error && <div className="alert">{error}</div>}
                <div className="field">
                  <label htmlFor="sub">Subject</label>
                  <input id="sub" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="msg">Message</label>
                  <textarea id="msg" className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} required />
                </div>
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "Sending…" : "Submit ticket"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
