"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";

import { usePathname } from "@/i18n/navigation";
import { sendChatMessage, type ChatTurn } from "@/lib/api";

// Floating AI assistant. The API keeps the Gemini key and builds the prompt
// from the organization's published content; this component only carries the
// conversation. The conversation survives page changes through sessionStorage.

export type ChatConfig = { enabled: boolean; name: string; welcome: string; suggestedQuestions: string[] };

const SESSION_KEY = "brhw_chat_session";
const MESSAGES_KEY = "brhw_chat_messages";
const MAX_INPUT = 1500;

type Status = "idle" | "sending" | "error" | "limit";

function readStored(): { sessionKey: string | null; messages: ChatTurn[] } {
  try {
    const sessionKey = sessionStorage.getItem(SESSION_KEY);
    const raw = sessionStorage.getItem(MESSAGES_KEY);
    const messages = raw ? (JSON.parse(raw) as ChatTurn[]) : [];
    return { sessionKey, messages: Array.isArray(messages) ? messages.slice(-40) : [] };
  } catch {
    return { sessionKey: null, messages: [] };
  }
}

function store(sessionKey: string | null, messages: ChatTurn[]) {
  try {
    if (sessionKey) sessionStorage.setItem(SESSION_KEY, sessionKey);
    else sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // private mode or storage disabled: the conversation simply lives in memory
  }
}

// Minimal, safe rendering of the model's text: paragraphs, "- " bullets,
// **bold** and bare URLs. No HTML is ever injected.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|https?:\/\/[^\s)<>"']+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>);
    } else {
      const trimmed = token.replace(/[.,;:!?]+$/, "");
      const trailing = token.slice(trimmed.length);
      nodes.push(
        <a key={`${keyPrefix}-a${i}`} href={trimmed} target="_blank" rel="noopener noreferrer">
          {trimmed.replace(/^https?:\/\//, "")}
        </a>,
      );
      if (trailing) nodes.push(trailing);
    }
    last = match.index + token.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderMessage(text: string) {
  const blocks: ReactNode[] = [];
  const lines = text.split(/\r?\n/);
  let list: string[] = [];
  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key}>
        {list.map((item, idx) => (
          <li key={idx}>{renderInline(item, `${key}-${idx}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  lines.forEach((line, idx) => {
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList(`l${idx}`);
    if (line.trim()) blocks.push(<p key={`p${idx}`}>{renderInline(line, `p${idx}`)}</p>);
  });
  flushList("l-end");
  return blocks;
}

export function ChatWidget({ config }: { config: ChatConfig | null }) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    // Keep the newest bubble in view.
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, open]);

  if (!config?.enabled) return null;

  const openPanel = () => {
    if (!loaded) {
      const stored = readStored();
      setSessionKey(stored.sessionKey);
      setMessages(stored.messages);
      setLoaded(true);
    }
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const reset = () => {
    setMessages([]);
    setSessionKey(null);
    setStatus("idle");
    store(null, []);
    inputRef.current?.focus();
  };

  const send = async (text: string) => {
    const content = text.trim().slice(0, MAX_INPUT);
    if (!content || status === "sending") return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setStatus("sending");
    try {
      const result = await sendChatMessage({ sessionKey, locale, page: pathname, messages: next.slice(-12) });
      const withReply = [...next, { role: "assistant" as const, content: result.reply }];
      setMessages(withReply);
      setSessionKey(result.sessionKey);
      store(result.sessionKey, withReply);
      setStatus("idle");
    } catch (error) {
      store(sessionKey, next);
      setStatus(error instanceof Error && error.message === "limit" ? "limit" : "error");
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <>
      {!open ? (
        <button type="button" className="chat-launcher" onClick={openPanel} aria-label={t("open")}>
          <MessageCircle className="size-5" aria-hidden="true" />
          <span className="chat-launcher__label">{t("open")}</span>
        </button>
      ) : null}

      {open ? (
        <section className="chat-panel" role="dialog" aria-label={config.name} aria-modal="false">
          <header className="chat-header">
            <span className="chat-header__avatar" aria-hidden="true">
              <Sparkles className="size-4" />
            </span>
            <div className="chat-header__title">
              <strong>{config.name}</strong>
              <span className="chat-header__badge">{t("aiBadge")}</span>
            </div>
            <button type="button" className="chat-header__button" onClick={reset} aria-label={t("newChat")} title={t("newChat")}>
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className="chat-header__button" onClick={() => setOpen(false)} aria-label={t("close")} title={t("close")}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div className="chat-messages" ref={listRef} aria-live="polite">
            <div className="chat-bubble chat-bubble--assistant">{renderMessage(config.welcome)}</div>
            {messages.length === 0 && config.suggestedQuestions.length > 0 ? (
              <div className="chat-suggestions">
                <span className="chat-suggestions__label">{t("suggestionsLabel")}</span>
                {config.suggestedQuestions.map((q) => (
                  <button key={q} type="button" className="chat-suggestion" onClick={() => void send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble chat-bubble--${m.role}`}>
                {m.role === "assistant" ? renderMessage(m.content) : <p>{m.content}</p>}
              </div>
            ))}
            {status === "sending" ? (
              <div className="chat-bubble chat-bubble--assistant chat-typing" aria-label={t("thinking")}>
                <span />
                <span />
                <span />
              </div>
            ) : null}
            {status === "error" ? <p className="chat-error">{t("error")}</p> : null}
            {status === "limit" ? <p className="chat-error">{t("limit")}</p> : null}
          </div>

          <form className="chat-input" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
              onKeyDown={onKeyDown}
              placeholder={t("placeholder")}
              rows={1}
              maxLength={MAX_INPUT}
              aria-label={t("placeholder")}
              disabled={status === "sending"}
            />
            <button type="submit" className="chat-input__send" disabled={status === "sending" || !input.trim()} aria-label={t("send")}>
              <Send className="size-4" aria-hidden="true" />
            </button>
          </form>
          <p className="chat-footer">{t("disclaimer")}</p>
        </section>
      ) : null}
    </>
  );
}
