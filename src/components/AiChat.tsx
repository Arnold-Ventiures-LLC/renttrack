import { useState, useEffect, useRef } from "preact/hooks";

type Msg = { role: "user" | "assistant"; content: string };

const BASE = "/api/ai-chat";

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        setMessages([{ role: "assistant", content: "Hi! I'm your RentTrack assistant. Ask me anything about your rent, bills, payments, or how to use the portal." }]);
      }
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.reply) throw new Error("No reply received");
      setMessages(m => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      setError(msg.includes("API key not configured")
        ? "⚠️ OpenAI API key not set in Vercel — add OPENAI_API_KEY to environment variables."
        : `Error: ${msg}`);
    }
    setLoading(false);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "52px", height: "52px", borderRadius: "50%",
          background: "linear-gradient(135deg, #00c9a7, #0080ff)",
          border: "none", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: "22px", boxShadow: "0 4px 20px rgba(0,201,167,0.4)",
          zIndex: 9998, transition: "transform 0.2s",
        }}
        title="AI Assistant"
      >
        {open ? "✕" : "✨"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: "88px", right: "24px",
          width: "340px", maxWidth: "calc(100vw - 32px)",
          height: "480px", maxHeight: "70vh",
          background: "#0f1e30", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px", boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column", zIndex: 9997,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(135deg, rgba(0,201,167,0.15), rgba(0,128,255,0.1))",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ fontSize: "20px" }}>✨</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#e8f4f1" }}>RentTrack Assistant</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>Powered by ChatGPT</div>
            </div>
            <button onClick={() => setMessages([])} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "12px" }} title="Clear chat">↺</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user" ? "linear-gradient(135deg, #00c9a7, #0080ff)" : "rgba(255,255,255,0.07)",
                  color: m.role === "user" ? "#fff" : "#dce8f0",
                  fontSize: "13px", lineHeight: "1.5",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "9px 13px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.07)", display: "flex", gap: "4px", alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00c9a7", opacity: 0.7, animation: `bounce 1.2s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            {error && <div style={{ fontSize: "12px", color: "#f43f5e", textAlign: "center" }}>{error}</div>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "8px" }}>
            <input
              ref={inputRef}
              value={input}
              onInput={e => setInput((e.target as HTMLInputElement).value)}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              disabled={loading}
              style={{
                flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px", padding: "9px 12px", color: "#e8f4f1", fontSize: "13px", outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: input.trim() && !loading ? "linear-gradient(135deg, #00c9a7, #0080ff)" : "rgba(255,255,255,0.08)",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
            >➤</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
