"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport, type UIMessage } from "ai";
import { createVaultAgent } from "@/lib/agent";
import { labelFor, providerIconSrc } from "@/lib/models";
import { saveModel } from "@/lib/store";
import { newChatId, saveTurn, type StoredChat, type MetaEvt } from "@/lib/chats";
import { listNotes, type NoteContent, type SearchHit } from "@/lib/vault-browser";
import {
  buildNoteIndex,
  NoteLink,
  NoteLinksProvider,
  type NoteIndex,
} from "./NoteLinks";
import { ConstellationField } from "./ConstellationField";
import { Markdown } from "./Markdown";
import { ModelSwitcher } from "./ModelSwitcher";
import { HistoryPanel } from "./HistoryPanel";
import { AboutPanel } from "./AboutPanel";
import { MigratePanel } from "./MigratePanel";
import { Gem } from "./Gem";

const EXAMPLES = [
  "Where are my notes on this project?",
  "Find notes that mention deadlines",
  "Summarize what I wrote about onboarding",
];

const TOOL_META: Record<string, { icon: string; verb: string }> = {
  "tool-search_vault": { icon: "✦", verb: "Searching" },
  "tool-list_notes": { icon: "❖", verb: "Listing notes" },
  "tool-read_note": { icon: "◆", verb: "Reading" },
};


export function Chat(props: {
  apiKey: string;
  model: string;
  handle: FileSystemDirectoryHandle;
  vaultLabel: string;
  onLock: () => void;
  onChangeVault: () => void;
}) {
  const [model, setModel] = useState(props.model);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [active, setActive] = useState<{
    id: string;
    initial: UIMessage[];
    events: MetaEvt[];
  }>(() => ({ id: newChatId(), initial: [], events: [] }));

  function changeModel(next: string) {
    setModel(next);
    saveModel(next);
  }
  function newChat() {
    setActive({ id: newChatId(), initial: [], events: [] });
  }
  function openChat(chat: StoredChat) {
    setModel(chat.model);
    saveModel(chat.model);
    setActive({ id: chat.id, initial: chat.messages, events: chat.events ?? [] });
    setHistoryOpen(false);
  }

  // a new vault means a new conversation
  const prevHandle = useRef(props.handle);
  useEffect(() => {
    if (prevHandle.current !== props.handle) {
      prevHandle.current = props.handle;
      newChat();
    }
  }, [props.handle]);

  return (
    <main className="chat">
      <header className="topbar glass">
        <div className="topbar-left">
          <button className="brand-sm" title="New chat" onClick={newChat}>
            <Gem size={24} />
            <span>askvault</span>
            <svg className="brand-plus" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="icon-btn"
            title="Chat history"
            onClick={() => setHistoryOpen(true)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M3 5v5h5M3.5 9a9 9 0 1 1-.8 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12 8v4l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="icon-btn"
            title="Import / export chats"
            onClick={() => setMigrateOpen(true)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
              <path d="M8 21V7m0 14l-3.5-3.5M8 21l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 3v14m0-14l-3.5 3.5M16 3l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="icon-btn"
            title="About askvault"
            onClick={() => setAboutOpen(true)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 11v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="topbar-right">
          <ModelSwitcher value={model} onChange={changeModel} />
          <button
            className="vault-pill"
            title={`${props.vaultLabel} · read-only — click to change vault`}
            onClick={props.onChangeVault}
          >
            <span className="vault-lock">🔒</span>
            <span className="vault-name">{props.vaultLabel}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" className="chev" aria-hidden>
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </button>
          <button className="ghost-sm" onClick={props.onLock}>
            Lock
          </button>
        </div>
      </header>

      <ChatSession
        key={active.id}
        chatId={active.id}
        initialMessages={active.initial}
        initialEvents={active.events}
        apiKey={props.apiKey}
        model={model}
        handle={props.handle}
        vaultLabel={props.vaultLabel}
      />

      {historyOpen && (
        <HistoryPanel
          currentId={active.id}
          onClose={() => setHistoryOpen(false)}
          onSelect={openChat}
          onNew={() => {
            newChat();
            setHistoryOpen(false);
          }}
        />
      )}

      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
      {migrateOpen && <MigratePanel onClose={() => setMigrateOpen(false)} />}
    </main>
  );
}

function ChatSession({
  chatId,
  initialMessages,
  initialEvents,
  apiKey,
  model,
  handle,
  vaultLabel,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  initialEvents: MetaEvt[];
  apiKey: string;
  model: string;
  handle: FileSystemDirectoryHandle;
  vaultLabel: string;
}) {
  // keep the latest model/vault readable inside stable callbacks
  const modelRef = useRef(model);
  modelRef.current = model;
  const vaultRef = useRef(vaultLabel);
  vaultRef.current = vaultLabel;
  const messagesRef = useRef<UIMessage[]>(initialMessages);

  // UI-only system markers (model switched, context compacted) — never sent to the model
  const [events, setEvents] = useState<MetaEvt[]>(initialEvents);
  const eventsRef = useRef<MetaEvt[]>(initialEvents);
  eventsRef.current = events;
  // the model under which the last message was actually SENT
  const lastUsedModelRef = useRef(model);

  const onCompact = useCallback(() => {
    setEvents((prev) => {
      if (prev[prev.length - 1]?.kind === "compact") return prev; // don't repeat
      const afterId = messagesRef.current[messagesRef.current.length - 1]?.id ?? null;
      return [...prev, { id: `c${Date.now()}`, kind: "compact", afterId }];
    });
  }, []);

  const transport = useMemo(
    () =>
      new DirectChatTransport({
        agent: createVaultAgent(apiKey, () => modelRef.current, handle, onCompact),
        // stamp each assistant message with the model + a timestamp
        messageMetadata: () => ({
          model: modelRef.current,
          createdAt: new Date().toISOString(),
        }),
      }),
    [apiKey, handle, onCompact],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    // stored messages are generic UIMessage[]; useChat infers a tool-specialized
    // message type from the agent, so cast at this boundary. Sanitize so a
    // previously-saved empty-parts stub can't poison the first send.
    messages: sanitizeHistory(initialMessages) as never,
    transport,
    onFinish: ({ messages }) =>
      saveTurn({
        id: chatId,
        messages: messages as UIMessage[],
        model: modelRef.current,
        vaultLabel: vaultRef.current,
        events: eventsRef.current,
      }),
    onError: (err) => {
      // the SDK swallows caught errors — log the raw one so the stack is visible
      console.error("[askvault] send error:", err);
      // CRITICAL: a failed turn leaves a poisoned message in history (empty
      // assistant stub or a dangling tool-call). The transport re-validates the
      // WHOLE history on every send, so that poison makes all future sends throw
      // client-side (no network call) until a new chat. Strip it so resends work.
      const cleaned = sanitizeHistory(messagesRef.current as UIMessage[]);
      messagesRef.current = cleaned;
      setMessages(cleaned as never);

      const afterId = cleaned[cleaned.length - 1]?.id ?? null;
      const last = eventsRef.current[eventsRef.current.length - 1];
      if (last?.kind === "error" && last.afterId === afterId) return; // don't stack
      const next: MetaEvt[] = [
        ...eventsRef.current,
        {
          id: `e${Date.now()}`,
          kind: "error",
          reason: explainError(err, modelRef.current),
          detail: rawError(err),
          model: modelRef.current,
          afterId,
        },
      ];
      setEvents(next);
      // persist the failed turn (cleaned) so the user's message + error aren't lost
      saveTurn({
        id: chatId,
        messages: cleaned,
        model: modelRef.current,
        vaultLabel: vaultRef.current,
        events: next,
      });
    },
  });
  messagesRef.current = messages;

  // index the real vault so note references become "open in Obsidian" links.
  // re-walk it (cheap) on mount, on window focus (after editing in Obsidian),
  // and on each send — so notes created/renamed mid-session still linkify.
  // since linkify is render-time, refreshing re-links the whole transcript.
  const [noteIndex, setNoteIndex] = useState<NoteIndex | null>(null);
  const refreshIndex = useCallback(() => {
    listNotes(handle)
      .then((notes) => setNoteIndex(buildNoteIndex(vaultRef.current, notes)))
      .catch(() => {});
  }, [handle]);
  useEffect(() => {
    refreshIndex();
    window.addEventListener("focus", refreshIndex);
    return () => window.removeEventListener("focus", refreshIndex);
  }, [refreshIndex]);

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    refreshIndex(); // pick up notes created/renamed since the chat opened
    // mark a model switch only when this message actually USES a different model
    // than the previous message — never on the first message or a mere dropdown change.
    if (messages.length > 0 && model !== lastUsedModelRef.current) {
      const afterId = messages[messages.length - 1]?.id ?? null;
      setEvents((prev) => [
        ...prev,
        { id: `m${Date.now()}`, kind: "model", label: labelFor(model), afterId },
      ]);
    }
    lastUsedModelRef.current = model;
    sendMessage({ text, metadata: { createdAt: new Date().toISOString() } } as never);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <NoteLinksProvider value={noteIndex}>
      <ConstellationField active={busy} density={empty ? 1.25 : 0.55} quiet={!empty} />

      <section className={`stream ${empty ? "is-empty" : ""}`}>
        {empty && (
          <div className="hero stagger">
            <div className="hero-gem" style={{ "--i": 0 } as React.CSSProperties}>
              <Gem size={72} />
            </div>
            <h2 style={{ "--i": 1 } as React.CSSProperties} className="shimmer">
              Light up your second brain
            </h2>
            <p className="muted hero-sub" style={{ "--i": 2 } as React.CSSProperties}>
              Ask in plain language — I search, list, and read your notes, and
              nothing else. They go only to the model, never to a server.
            </p>
            <div className="examples" style={{ "--i": 3 } as React.CSSProperties}>
              {EXAMPLES.map((ex) => (
                <button key={ex} className="example" onClick={() => submit(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {interleave(messages, events)}

        {busy &&
          (() => {
            // show "thinking" while waiting — incl. when the assistant message
            // exists but has no visible content yet (we hide empty stubs)
            const last = messages[messages.length - 1];
            const lastHasContent =
              last?.role === "assistant" &&
              last.parts.some(
                (p: any) =>
                  (p.type === "text" && p.text?.trim()) ||
                  (typeof p.type === "string" && p.type.startsWith("tool-")),
              );
            if (last && last.role !== "user" && lastHasContent) return null;
            return (
              <div className="row row-assistant">
                <Avatar />
                <div className="msg-body">
                  <div className="thinking">
                    <span /> <span /> <span />
                  </div>
                </div>
              </div>
            );
          })()}

        <div ref={endRef} />
      </section>

      <form
        className="composer glass"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <span className="composer-spark">✦</span>
        <input
          value={input}
          placeholder="Search your vault…"
          onChange={(e) => setInput(e.currentTarget.value)}
          autoFocus
        />
        <button type="submit" className="send" disabled={busy || !input.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path d="M3 11l18-8-8 18-2-7-8-3z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </NoteLinksProvider>
  );
}

function Avatar() {
  return (
    <div className="avatar">
      <Gem size={18} />
    </div>
  );
}

/**
 * Remove any message with no parts. A failed turn leaves an empty assistant
 * stub (`{ parts: [] }`) ANYWHERE in the history, and validateUIMessages rejects
 * every message with zero parts ("Message must contain at least one part") on
 * EVERY subsequent send — throwing before the network call, until a new chat.
 * So we must drop empty-parts messages (not just trailing ones).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeHistory(msgs: any[]): any[] {
  const clean = (msgs ?? []).filter(
    (m) => Array.isArray(m?.parts) && m.parts.length > 0,
  );
  return clean.length === (msgs?.length ?? 0) ? msgs : clean;
}

/** The full raw error (for the "show details" expander — copyable, console-like). */
function rawError(err: unknown): string {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const e = err as any;
  if (!e) return "Unknown error";
  const segs: string[] = [];
  if (e.name || e.message) segs.push(`${e.name ?? "Error"}: ${e.message ?? ""}`.trim());
  const body = e.responseBody ?? e.cause?.responseBody ?? e.data;
  if (body)
    segs.push(
      "Response: " + (typeof body === "string" ? body : JSON.stringify(body, null, 2)),
    );
  if (e.stack) segs.push(String(e.stack));
  return segs.join("\n\n") || String(err);
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** Turn a raw model/transport error into a clean, human reason. */
function explainError(err: unknown, model: string): string {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const e = err as any;
  const status: number | undefined =
    e?.statusCode ?? e?.status ?? e?.cause?.statusCode ?? e?.data?.error?.code;
  let providerMsg = "";
  try {
    const body = e?.responseBody ?? e?.data ?? e?.cause?.responseBody;
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    providerMsg = parsed?.error?.message ?? parsed?.message ?? "";
  } catch {
    /* not JSON */
  }
  const isFree = model.endsWith(":free");
  const raw = `${status ?? ""} ${providerMsg} ${e?.message ?? String(err ?? "")}`.toLowerCase();

  if (status === 401 || /\b401\b|unauthor|invalid api key|no auth|user not found/.test(raw))
    return `Your OpenRouter key was rejected — it may have been rotated or revoked. Lock and re-enter your current key.`;
  if (status === 402 || /\b402\b|insufficient|credit|payment|requires more/.test(raw))
    return `Out of OpenRouter credits for ${model}. Add credits at openrouter.ai/credits${isFree ? "" : " (or pick a free model)"}.`;
  if (status === 429 || /\b429\b|rate.?limit|too many/.test(raw))
    return isFree
      ? `Free models are rate-limited right now — switch to a cheap paid model (e.g. DeepSeek V4 Flash) or wait a bit.`
      : `Rate-limited by OpenRouter — wait a moment, then retry.`;
  if (status === 404 || /\b404\b|no endpoints|no allowed providers|not found/.test(raw))
    return `${model} isn't available right now. Try another model.`;
  if (/failed to fetch|load failed|network|connection|timeout|cors/.test(raw))
    return `Couldn't reach OpenRouter — network/CORS issue. Check your connection and try again.`;
  if (providerMsg) return `${model}: ${providerMsg}`;
  if (status) return `${model} failed (HTTP ${status}). Try again, or switch models.`;
  return `Couldn't get a response from ${model}. Try again, or switch models.`;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** Short visible clock for a message, e.g. "12:40 AM". */
function fmtClock(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Render messages with UI-only markers/errors interleaved at their anchor points. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function interleave(messages: any[], events: MetaEvt[]) {
  const out: React.ReactNode[] = [];
  const render = (e: MetaEvt) =>
    e.kind === "error" ? (
      <ErrorRow key={e.id} reason={e.reason ?? ""} detail={e.detail} />
    ) : (
      <MetaEvent key={e.id} evt={e} />
    );
  const emit = (evts: MetaEvt[]) => evts.forEach((e) => out.push(render(e)));

  emit(events.filter((e) => e.afterId === null));
  for (const message of messages) {
    out.push(
      message.role === "user" ? (
        <UserRow key={message.id} message={message} />
      ) : (
        <AssistantRow key={message.id} message={message} />
      ),
    );
    emit(events.filter((e) => e.afterId === message.id));
  }
  return out;
}

function MetaEvent({ evt }: { evt: MetaEvt }) {
  const text =
    evt.kind === "model"
      ? `switched to ${evt.label}`
      : "compacted earlier context to fit the model";
  return (
    <div className="meta-event">
      <span className="meta-line" />
      <span className="meta-text">✦ {text}</span>
      <span className="meta-line" />
    </div>
  );
}

function ErrorRow({ reason, detail }: { reason: string; detail?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(detail ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="row row-assistant">
      <Avatar />
      <div className="msg-body msg-body-error">
        <div className="msg-meta">
          <span className="msg-who">askvault</span>
        </div>
        <div className="error-line">{reason}</div>
        {detail && (
          <div className="error-detail">
            <button className="error-toggle" onClick={() => setOpen((o) => !o)}>
              <svg
                className={`error-chev ${open ? "open" : ""}`}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {open ? "hide details" : "show details"}
            </button>
            {open && (
              <div className="error-raw">
                <button className="error-copy" onClick={copy} title="Copy raw error">
                  {copied ? "copied" : "copy"}
                </button>
                <pre>{detail}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Full date + time for the hover tooltip, e.g. "Jun 3, 2026, 12:40 AM". */
function fmtTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function UserRow({ message }: { message: any }) {
  const text = message.parts
    .map((p: any) => (p.type === "text" ? p.text : ""))
    .join("");
  const iso = message.metadata?.createdAt;
  return (
    <div className="row row-user">
      <div className="u-wrap">
        <div className="bubble-user">{text}</div>
        {fmtClock(iso) && (
          <time className="msg-time" data-full={fmtTime(iso)}>
            {fmtClock(iso)}
          </time>
        )}
      </div>
    </div>
  );
}

function AssistantRow({ message }: { message: any }) {
  const [copied, setCopied] = useState(false);
  const text = message.parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join("\n\n")
    .trim();
  const hasContent =
    text.length > 0 ||
    message.parts.some(
      (p: any) => typeof p.type === "string" && p.type.startsWith("tool-"),
    );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  // an errored turn can leave an empty assistant stub (just the model badge) — skip it
  if (!hasContent) return null;

  return (
    <div className="row row-assistant">
      <Avatar />
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-who">askvault</span>
          {message.metadata?.model &&
            (() => {
              const icon = providerIconSrc(message.metadata.model);
              return (
                <span className="msg-model" title={message.metadata.model}>
                  {icon ? (
                    <span
                      className="msg-model-logo"
                      style={{
                        WebkitMaskImage: `url(${icon})`,
                        maskImage: `url(${icon})`,
                      }}
                    />
                  ) : (
                    <span className="msg-model-dot" />
                  )}
                  {labelFor(message.metadata.model)}
                </span>
              );
            })()}
          {fmtClock(message.metadata?.createdAt) && (
            <time className="msg-time" data-full={fmtTime(message.metadata.createdAt)}>
              {fmtClock(message.metadata.createdAt)}
            </time>
          )}
          {text && (
            <button className="copy-btn" onClick={copy} title="Copy">
              {copied ? "copied" : "copy"}
            </button>
          )}
        </div>
        {message.parts.map((part: any, i: number) => {
          if (part.type === "text" && part.text) {
            return <Markdown key={i}>{part.text}</Markdown>;
          }
          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            return <ToolPart key={i} part={part} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolPart({ part }: { part: any }) {
  const meta = TOOL_META[part.type] ?? { icon: "◆", verb: part.type };
  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const query = part.input?.query as string | undefined;
  const notePath = part.input?.path as string | undefined;

  return (
    <div className="tool">
      <div className={`tool-head ${running ? "running" : ""}`}>
        <span className="tool-icon">{meta.icon}</span>
        <span>
          {meta.verb}
          {query ? (
            ` “${query}”`
          ) : notePath ? (
            <>
              {" "}
              <NoteLink path={notePath} />
            </>
          ) : (
            ""
          )}
          {running ? "…" : ""}
        </span>
      </div>

      {part.state === "output-available" &&
        part.type === "tool-search_vault" && (
          <SearchResults hits={part.output as SearchHit[]} />
        )}
      {part.state === "output-available" && part.type === "tool-list_notes" && (
        <div className="tool-note">
          {(part.output as string[]).length} notes in the vault
        </div>
      )}
      {part.state === "output-available" && part.type === "tool-read_note" && (
        <div className="tool-note">
          read <NoteLink path={(part.output as NoteContent).path} />
          {(part.output as NoteContent).truncated ? " · truncated" : ""}
        </div>
      )}
      {part.state === "output-error" && (
        <div className="tool-note err">couldn’t complete: {part.errorText}</div>
      )}
    </div>
  );
}

function SearchResults({ hits }: { hits: SearchHit[] }) {
  if (!hits?.length) return <div className="tool-note">no matches found</div>;
  return (
    <div className="hits stagger">
      {hits.map((hit, i) => (
        <div
          key={hit.path}
          className="hit"
          style={{ "--i": i } as React.CSSProperties}
        >
          <div className="hit-path">
            <span className="file-ico">◆</span>
            <NoteLink path={hit.path} />
          </div>
          {hit.matches[0] && (
            <pre className="hit-snippet">{hit.matches[0].text}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
