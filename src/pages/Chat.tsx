import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { onValue, push, ref, set, get, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/firebase";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";

type ChatChannel = {
  id: string;
  name: string;
  isUpliner?: boolean;
  isDownliner?: boolean;
};

type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  imageUrl?: string;
  createdAt: number;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
};

export default function Chat() {
  const { user, userData } = useAuth();
  
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [loadingChannels, setLoadingChannels] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage["replyTo"] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Upliner and Downliners as Channels
  useEffect(() => {
    if (!user || !userData) return;

    const fetchContacts = async () => {
      setLoadingChannels(true);
      const newChannels: ChatChannel[] = [];
      const usersRef = ref(db, "users");

      // Fetch Upliner
      if (userData.referredBy) {
        try {
          const qUpliner = query(usersRef, orderByChild("affiliateCode"), equalTo(userData.referredBy));
          const snap = await get(qUpliner);
          if (snap.exists()) {
            const val = snap.val();
            const uid = Object.keys(val)[0];
            const uData = val[uid];
            const chatId = [user.uid, uid].sort().join("_");
            newChannels.push({
              id: chatId,
              name: uData.displayName || uData.username || "Upliner",
              isUpliner: true
            });
          }
        } catch (err) {
          console.error("Error fetching upliner", err);
        }
      }

      // Fetch Downliners
      if (userData.affiliateCode) {
        try {
          const qDownliners = query(usersRef, orderByChild("referredBy"), equalTo(userData.affiliateCode));
          const snap = await get(qDownliners);
          if (snap.exists()) {
            const val = snap.val();
            Object.keys(val).forEach(uid => {
              const dData = val[uid];
              const chatId = [user.uid, uid].sort().join("_");
              newChannels.push({
                id: chatId,
                name: dData.displayName || dData.username || "Downliner",
                isDownliner: true
              });
            });
          }
        } catch (err) {
          console.error("Error fetching downliners", err);
        }
      }

      setChannels(newChannels);
      if (newChannels.length > 0 && !activeChannelId) {
        setActiveChannelId(newChannels[0].id);
      }
      setLoadingChannels(false);
    };

    fetchContacts();
  }, [user, userData]);

  // Load messages for the active channel
  useEffect(() => {
    if (!activeChannelId) {
        setMessages([]);
        return;
    }
    const r = ref(db, `chatMessages/${activeChannelId}`);
    return onValue(r, (snap) => {
      const data = snap.val() as Record<string, Omit<ChatMessage, "id">> | null;
      if (!data) {
        setMessages([]);
        return;
      }
      const msgs = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
    });
  }, [activeChannelId]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (!text.trim() && !file) || !activeChannelId) return;
    setBusy(true);

    try {
      let imageUrl: string | undefined;

      if (file) {
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });
      }

      const key = push(ref(db, `chatMessages/${activeChannelId}`)).key;
      if (!key) throw new Error("No key");

      const msgData: Omit<ChatMessage, "id"> = {
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        text: text.trim(),
        createdAt: Date.now(),
      };
      if (imageUrl) msgData.imageUrl = imageUrl;
      if (replyTo) msgData.replyTo = replyTo;

      await set(ref(db, `chatMessages/${activeChannelId}/${key}`), msgData);

      setText("");
      setFile(null);
      setReplyTo(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <Shell>
        <div className="alert">
          Log in to join the chat. <Link to="/login">Log in</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Direct Messages</h1>
          <p className="muted" style={{ margin: 0 }}>Chat directly with your upliner and downliners.</p>
        </div>
      </div>

      <style>{`
        .chat-layout {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 16px;
        }
        @media (max-width: 860px) {
          .chat-layout {
            grid-template-columns: 1fr;
          }
          .chat-sidebar {
            height: auto !important;
            max-height: 25vh;
          }
          .chat-main {
            height: 65vh !important;
          }
        }
      `}</style>

      <div className="chat-layout">
        {/* Sidebar */}
        <div className="card chat-sidebar" style={{ height: "70vh", display: "flex", flexDirection: "column" }}>
          <div className="card-body" style={{ flex: 1, overflowY: "auto", padding: "16px 10px" }}>
            <h3 style={{ fontSize: 14, textTransform: "uppercase", color: "var(--muted)", margin: "0 0 12px 6px" }}>Contacts</h3>
            {loadingChannels ? (
              <div style={{ padding: "8px", color: "var(--muted)", fontSize: 13 }}>Loading contacts...</div>
            ) : channels.length === 0 ? (
               <div style={{ padding: "8px", color: "var(--muted)", fontSize: 13 }}>No contacts available.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {channels.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChannelId(c.id)}
                    style={{
                      textAlign: "left", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: activeChannelId === c.id ? "rgba(56, 189, 248, 0.15)" : "transparent",
                      color: activeChannelId === c.id ? "var(--text)" : "var(--muted)",
                      fontWeight: activeChannelId === c.id ? 600 : 400,
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{c.isUpliner ? "🤝" : "👤"}</span>
                    <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                        {c.isUpliner && <span style={{ display: "block", fontSize: 10, color: "var(--accent)" }}>Upliner</span>}
                        {c.isDownliner && <span style={{ display: "block", fontSize: 10, color: "var(--accent2)" }}>Downliner</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="card chat-main" style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--stroke)", background: "rgba(5,8,22,0.4)" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {activeChannelId 
                ? (channels.find(c => c.id === activeChannelId)?.name || "Chat") 
                : "Select a contact"}
            </h2>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {!activeChannelId ? (
                <div className="muted" style={{ textAlign: "center", marginTop: 20 }}>Select someone to start chatting.</div>
            ) : messages.length === 0 ? (
                <div className="muted" style={{ textAlign: "center", marginTop: 20 }}>No messages yet. Send a message to start!</div>
            ) : (
                messages.map((m) => {
                  const isMine = m.userId === user.uid;
                  
                  return (
                    <div key={m.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, textAlign: isMine ? "right" : "left", padding: "0 4px", display: "flex", gap: 8, alignItems: "center", flexDirection: isMine ? "row-reverse" : "row" }}>
                        <span style={{ fontWeight: 600, color: "inherit" }}>
                          {m.userName}
                        </span>
                        <span>• {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      <div 
                        style={{ 
                          background: isMine ? "rgba(56, 189, 248, 0.2)" : "rgba(5, 8, 22, 0.95)", 
                          border: isMine ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid var(--stroke)",
                          padding: "10px 14px", 
                          borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        }}
                      >
                        {m.replyTo && (
                          <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 10px", borderRadius: 8, marginBottom: 8, fontSize: 13, borderLeft: "3px solid var(--accent)" }}>
                            <strong style={{ color: "var(--accent)", display: "block" }}>{m.replyTo.userName}</strong>
                            <span className="muted" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.replyTo.text || "Image"}</span>
                          </div>
                        )}
                        {m.imageUrl && (
                          <img src={m.imageUrl} alt="attachment" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: m.text ? 8 : 0, maxHeight: 200, objectFit: "contain", display: "block" }} />
                        )}
                        {m.text && <div style={{ wordBreak: "break-word" }}>{m.text}</div>}
                      </div>
                      
                      {!isMine && (
                        <button 
                          onClick={() => setReplyTo({ id: m.id, userName: m.userName, text: m.text })}
                          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", marginTop: 4, padding: "0 4px" }}
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          {/* Input Area */}
          <div style={{ borderTop: "1px solid var(--stroke)", padding: "12px", background: "rgba(5, 8, 22, 0.8)", opacity: activeChannelId ? 1 : 0.5, pointerEvents: activeChannelId ? "auto" : "none" }}>
            {replyTo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(56, 189, 248, 0.1)", padding: "6px 12px", borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Replying to <strong style={{ color: "var(--accent)" }}>{replyTo.userName}</strong>: {replyTo.text || "Image"}
                </div>
                <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>&times;</button>
              </div>
            )}
            <form onSubmit={sendMessage} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ cursor: "pointer", color: file ? "var(--accent)" : "var(--muted)", padding: "8px", background: "rgba(17, 27, 51, 0.5)", borderRadius: "8px", border: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </label>
              <input 
                className="input" 
                style={{ flex: 1 }} 
                placeholder={activeChannelId ? `Message ${channels.find(c => c.id === activeChannelId)?.name || ""}...` : ""}
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                disabled={!activeChannelId}
              />
              <button className="btn breathe" type="submit" disabled={busy || (!text.trim() && !file) || !activeChannelId}>
                {busy ? "..." : "Send"}
              </button>
            </form>
            {file && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>Attachment: {file.name}</div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}



