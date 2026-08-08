"use client";

/**
 * Floating owner-chat widget (admin audience only). Answers come from a live
 * data snapshot via askAiSupervisorAction — LLM when configured, rule matcher
 * otherwise — so the owner always gets grounded answers, never hallucinations.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, X, Send } from "lucide-react";
import { askAiSupervisorAction, loadAiChatSessionAction } from "@/app/ops-actions";

type ChatMessage = { role: "user" | "assistant"; content: string; model?: string };

export function AiChatWidget() {
  const t = useTranslations("AiChat");
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore the latest session the first time the panel opens.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    loadAiChatSessionAction().then((result) => {
      if (cancelled) return;
      if (result.sessionId) {
        setSessionId(result.sessionId);
        setMessages(
          result.messages.map((row) => ({
            role: row.role === "assistant" ? "assistant" : "user",
            content: row.content,
            model: row.model,
          }))
        );
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    try {
      const result = await askAiSupervisorAction({ sessionId, message: text });
      if ("error" in result) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("errorReply"), model: "rules" },
        ]);
      } else {
        setSessionId(result.sessionId);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.answer, model: result.model },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("errorReply"), model: "rules" },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openLabel")}
        style={{
          position: "fixed",
          right: "1.1rem",
          bottom: "1.1rem",
          zIndex: 70,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-ink, #fff)",
          display: open ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        <MessageCircle size={22} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("title")}
          className="surface"
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: 70,
            width: "min(380px, calc(100vw - 2rem))",
            height: "min(520px, calc(100dvh - 5rem))",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="row"
            style={{
              padding: "0.75rem 0.9rem",
              borderBottom: "1px solid var(--line)",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{t("title")}</div>
              <div className="muted" style={{ fontSize: "0.72rem" }}>
                {t("subtitle")}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              style={{ padding: "0.3rem" }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.55rem",
            }}
          >
            {messages.length === 0 && !sending ? (
              <p className="muted" style={{ fontSize: "0.82rem", margin: "0.25rem 0" }}>
                {t("emptyState")}
              </p>
            ) : null}
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "0.5rem 0.7rem",
                  borderRadius: 12,
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                  background:
                    message.role === "user" ? "var(--accent)" : "var(--surface-2, var(--line))",
                  color: message.role === "user" ? "var(--accent-ink, #fff)" : "inherit",
                }}
              >
                {message.content}
              </div>
            ))}
            {sending ? (
              <div className="muted" style={{ fontSize: "0.78rem", fontStyle: "italic" }}>
                {t("thinking")}
              </div>
            ) : null}
          </div>

          <div
            className="row"
            style={{
              padding: "0.6rem",
              borderTop: "1px solid var(--line)",
              gap: "0.4rem",
            }}
          >
            <input
              className="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder={t("placeholder")}
              maxLength={500}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              aria-label={t("send")}
              style={{ padding: "0.5rem 0.7rem" }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
