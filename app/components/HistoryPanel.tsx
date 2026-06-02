"use client";

import { useEffect, useState } from "react";
import {
  listChats,
  deleteChat,
  renameChat,
  setChatPinned,
  type StoredChat,
} from "@/lib/chats";
import { labelFor } from "@/lib/models";

/** Relative time, then exact date+time once it's older than a day. */
function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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

  async function togglePin(e: React.MouseEvent, chat: StoredChat) {
    e.stopPropagation();
    const pinned = !chat.pinned;
    await setChatPinned(chat.id, pinned);
    setChats((c) =>
      (c ?? []).map((x) => (x.id === chat.id ? { ...x, pinned } : x)),
    );
  }

  function startRename(e: React.MouseEvent, chat: StoredChat) {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditValue(chat.title);
  }

  async function commitRename(id: string) {
    const title = editValue.trim();
    setEditingId(null);
    if (!title) return;
    await renameChat(id, title);
    setChats((c) =>
      (c ?? []).map((x) => (x.id === id ? { ...x, title, titleCustom: true } : x)),
    );
  }

  // flat list, pinned first (stable sort preserves the updatedAt-desc order)
  const ordered = chats
    ? [...chats].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
    : [];

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

          {ordered.map((chat) => (
            <div
              key={chat.id}
              className={`history-item ${chat.id === currentId ? "active" : ""}`}
            >
              {editingId === chat.id ? (
                <input
                  className="hi-rename"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitRename(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(chat.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button className="hi-open" onClick={() => onSelect(chat)}>
                  <span className="hi-title">
                    {chat.pinned && <span className="hi-pin-mark">📌</span>}
                    {chat.title}
                  </span>
                  <span className="hi-meta">
                    {relTime(chat.updatedAt)} · {labelFor(chat.model)} ·{" "}
                    {chat.vaultLabel}
                  </span>
                </button>
              )}

              <div className="hi-actions">
                <button
                  className={`hi-act ${chat.pinned ? "on" : ""}`}
                  title={chat.pinned ? "Unpin" : "Pin"}
                  onClick={(e) => togglePin(e, chat)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                    <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="hi-act" title="Rename" onClick={(e) => startRename(e, chat)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                    <path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="hi-act hi-del" title="Delete" onClick={(e) => remove(e, chat.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
