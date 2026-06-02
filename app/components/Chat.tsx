"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport, type UIMessage } from "ai";
import { createVaultAgent } from "@/lib/agent";
import { saveModel } from "@/lib/store";
import { newChatId, saveTurn, type StoredChat } from "@/lib/chats";
import type { NoteContent, SearchHit } from "@/lib/vault-browser";
import { ConstellationField } from "./ConstellationField";
import { Markdown } from "./Markdown";
import { ModelSwitcher } from "./ModelSwitcher";
import { HistoryPanel } from "./HistoryPanel";
import { AboutPanel } from "./AboutPanel";
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
  const [active, setActive] = useState<{ id: string; initial: UIMessage[] }>(
    () => ({ id: newChatId(), initial: [] }),
  );

  function changeModel(next: string) {
    setModel(next);
    saveModel(next);
  }
  function newChat() {
    setActive({ id: newChatId(), initial: [] });
  }
  function openChat(chat: StoredChat) {
    setModel(chat.model);
    saveModel(chat.model);
    setActive({ id: chat.id, initial: chat.messages });
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
          <div className="brand-sm">
            <Gem size={24} />
            <span>askvault</span>
          </div>
          <button className="icon-btn" title="New chat" onClick={newChat}>
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
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
    </main>
  );
}

function ChatSession({
  chatId,
  initialMessages,
  apiKey,
  model,
  handle,
  vaultLabel,
}: {
  chatId: string;
  initialMessages: UIMessage[];
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

  const transport = useMemo(
    () =>
      new DirectChatTransport({
        agent: createVaultAgent(apiKey, () => modelRef.current, handle),
      }),
    [apiKey, handle],
  );

  const { messages, sendMessage, status, error } = useChat({
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
      }),
  });

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <>
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

        {messages.map((message) =>
          message.role === "user" ? (
            <UserRow key={message.id} message={message} />
          ) : (
            <AssistantRow key={message.id} message={message} />
          ),
        )}

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

        {error && (
          <div className="row row-assistant">
            <Avatar />
            <div className="msg-body">
              <div className="error-note">
                Couldn’t reach the model. Check your key and that{" "}
                <code className="md-code-inline">{model}</code> is available.
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
    </>
  );
}

function Avatar() {
  return (
    <div className="avatar">
      <Gem size={18} />
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
          {query ? ` “${query}”` : notePath ? ` ${notePath}` : ""}
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
          read {(part.output as NoteContent).path}
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
            {hit.path}
          </div>
          {hit.matches[0] && (
            <pre className="hit-snippet">{hit.matches[0].text}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
