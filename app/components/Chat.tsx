"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport, type UIMessage } from "ai";
import { createVaultAgent } from "@/lib/agent";
import { labelFor } from "@/lib/models";
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
      }),
    [apiKey, handle, onCompact],
  );

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    // stored messages are generic UIMessage[]; useChat infers a tool-specialized
    // message type from the agent, so cast at this boundary.
    messages: initialMessages as never,
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
      const afterId = messagesRef.current[messagesRef.current.length - 1]?.id ?? null;
      const last = eventsRef.current[eventsRef.current.length - 1];
      if (last?.kind === "error" && last.afterId === afterId) return; // don't stack
      const next: MetaEvt[] = [
        ...eventsRef.current,
        {
          id: `e${Date.now()}`,
          kind: "error",
          reason: explainError(err, modelRef.current),
          model: modelRef.current,
          afterId,
        },
      ];
      setEvents(next);
      // persist the failed turn so the user's message + the error aren't lost
      saveTurn({
        id: chatId,
        messages: messagesRef.current as UIMessage[],
        model: modelRef.current,
        vaultLabel: vaultRef.current,
        events: next,
      });
    },
  });
  messagesRef.current = messages;

  // index the real vault once so note references become "open in Obsidian" links
  const [noteIndex, setNoteIndex] = useState<NoteIndex | null>(null);
  useEffect(() => {
    let alive = true;
    listNotes(handle)
      .then((notes) => {
        if (alive) setNoteIndex(buildNoteIndex(vaultRef.current, notes));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [handle]);

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
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
    sendMessage({ text });
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

        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="row row-assistant">
            <Avatar />
            <div className="msg-body">
              <div className="thinking">
                <span /> <span /> <span />
              </div>
            </div>
          </div>
        )}

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

/** Turn a raw model/transport error into a clean, human reason. */
function explainError(err: unknown, model: string): string {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (/402|credit|insufficient|payment|requires more/.test(msg))
    return `${model} needs OpenRouter credits — add credits, or switch to a free model.`;
  if (/401|unauthor|invalid api key|no auth/.test(msg))
    return `Your OpenRouter key was rejected. Lock and re-enter it to fix this.`;
  if (/404|not found|no endpoints|no allowed providers/.test(msg))
    return `${model} isn't available on your account right now. Try another model.`;
  if (/429|rate.?limit|too many/.test(msg))
    return `${model} is rate-limited right now. Wait a moment, then try again.`;
  if (/network|failed to fetch|fetch failed|connection|timeout/.test(msg))
    return `Couldn't reach OpenRouter — looks like a network hiccup. Try again.`;
  return `Couldn't get a response from ${model}. Try again, or switch models.`;
}

/** Render messages with UI-only markers/errors interleaved at their anchor points. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function interleave(messages: any[], events: MetaEvt[]) {
  const out: React.ReactNode[] = [];
  const render = (e: MetaEvt) =>
    e.kind === "error" ? (
      <ErrorRow key={e.id} reason={e.reason ?? ""} />
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

function ErrorRow({ reason }: { reason: string }) {
  return (
    <div className="row row-assistant">
      <Avatar />
      <div className="msg-body msg-body-error">
        <div className="msg-meta">
          <span className="msg-who">askvault</span>
        </div>
        <div className="error-line">{reason}</div>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function UserRow({ message }: { message: any }) {
  const text = message.parts
    .map((p: any) => (p.type === "text" ? p.text : ""))
    .join("");
  return (
    <div className="row row-user">
      <div className="bubble-user">{text}</div>
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

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="row row-assistant">
      <Avatar />
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-who">askvault</span>
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
