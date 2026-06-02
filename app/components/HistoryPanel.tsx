"use client";

import { useEffect, useState } from "react";
import { listChats, deleteChat, type StoredChat } from "@/lib/chats";
import { labelFor } from "@/lib/models";

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function HistoryPanel({
  currentId,
  onClose,
  onSelect,
  onNew,
}: {
  currentId: string;
  onClose: () => void;
  onSelect: (chat: StoredChat) => void;
  onNew: () => void;
}) {
  const [chats, setChats] = useState<StoredChat[] | null>(null);

  useEffect(() => {
    listChats().then(setChats);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteChat(id);
    setChats((c) => (c ?? []).filter((x) => x.id !== id));
  }

  return (
    <div className="history-backdrop" onClick={onClose}>
      <div
        className="history-panel glass"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Chat history"
      >
        <div className="history-head">
          <div className="history-title">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path d="M3 5v5h5M3.5 9a9 9 0 1 1-.8 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 8v4l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Chat history
          </div>
          <button className="primary-sm" onClick={onNew}>
            + New chat
          </button>
        </div>

        <div className="history-list">
          {chats === null && <div className="history-empty">Loading…</div>}
          {chats !== null && chats.length === 0 && (
            <div className="history-empty">
              No conversations yet. Your chats are saved here, locally on this
              device.
            </div>
          )}
          {chats?.map((chat) => (
            <button
              key={chat.id}
              className={`history-item ${chat.id === currentId ? "active" : ""}`}
              onClick={() => onSelect(chat)}
            >
              <div className="hi-main">
                <span className="hi-title">{chat.title}</span>
                <span className="hi-meta">
                  {relativeTime(chat.updatedAt)} · {labelFor(chat.model)} ·{" "}
                  {chat.vaultLabel}
                </span>
              </div>
              <span
                className="hi-delete"
                title="Delete"
                role="button"
                tabIndex={0}
                onClick={(e) => remove(e, chat.id)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
