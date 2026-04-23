import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import type { AppNotification } from "@/types";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reads, setReads] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (!user) return;
    const r = ref(db, `userReads/${user.uid}`);
    return onValue(r, (snap) => {
      setReads(snap.val() || {});
    });
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user || reads[id]) return;
    try {
      await set(ref(db, `userReads/${user.uid}/${id}`), true);
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const newReads = { ...reads };
    notifications.forEach((n) => {
      if (n.id) newReads[n.id] = true;
    });
    try {
      await set(ref(db, `userReads/${user.uid}`), newReads);
    } catch {
      // ignore
    }
  };

  if (!user) {
    return (
      <Shell>
        <div className="alert">
          Log in to view your notifications. <Link to="/login">Log in</Link>
        </div>
      </Shell>
    );
  }

  const unreadCount = notifications.filter((n) => n.id && !reads[n.id]).length;

  return (
    <Shell>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Notifications</h1>
        {unreadCount > 0 && (
          <button className="btn btn-ghost" onClick={() => void markAllAsRead()}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {notifications.map((n) => {
          const isUnread = n.id && !reads[n.id];
          return (
            <div
              key={n.id}
              className="card"
              style={{
                cursor: isUnread ? "pointer" : "default",
                borderColor: isUnread ? "var(--accent)" : "var(--stroke)",
                background: isUnread ? "rgba(56, 189, 248, 0.05)" : undefined,
              }}
              onClick={() => {
                if (isUnread && n.id) {
                  void markAsRead(n.id);
                }
              }}
            >
              <div className="card-body row" style={{ gap: 16 }}>
                {n.imageUrl && (
                  <img
                    src={n.imageUrl}
                    alt=""
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, color: isUnread ? "var(--text)" : "var(--muted)" }}>
                      {n.title}
                    </div>
                    {isUnread && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                    )}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", opacity: 0.8 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!notifications.length && (
          <div className="card">
            <div className="card-body" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📭</div>
              <h3 style={{ margin: "0 0 8px" }}>No notifications</h3>
              <p className="muted" style={{ margin: 0 }}>You're all caught up!</p>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}


