"use client";

import { useEffect, useRef, useState } from "react";
import { importChats, listChats } from "@/lib/chats";

export function MigratePanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function doExport() {
    setBusy(true);
    setStatus(null);
    try {
      const chats = await listChats();
      const payload = {
        app: "askvault",
        version: 1,
        exportedAt: new Date().toISOString(),
        chats,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `askvault-chats-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${chats.length} chat${chats.length === 1 ? "" : "s"}.`);
    } catch {
      setStatus("Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const data = JSON.parse(await file.text());
      const n = await importChats(data);
      setStatus(
        n > 0
          ? `Imported ${n} chat${n === 1 ? "" : "s"}. Open history to see them.`
          : "Nothing new to import — your chats are already up to date.",
      );
    } catch {
      setStatus("Couldn't read that file — make sure it's an askvault export.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="history-backdrop" onClick={onClose}>
      <div
        className="migrate-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Import or export chats"
      >
        <button className="about-close" onClick={onClose} title="Close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="migrate-title">Import / export chats</h2>
        <p className="migrate-sub">
          Chats live only in this browser. Move them to another browser or device,
          or keep a backup.
        </p>

        <div className="migrate-row">
          <div className="migrate-info">
            <span className="migrate-k">Export</span>
            <span className="migrate-v">Download all chats as a JSON file.</span>
          </div>
          <button className="primary-sm" onClick={doExport} disabled={busy}>
            Export
          </button>
        </div>

        <div className="migrate-row">
          <div className="migrate-info">
            <span className="migrate-k">Import</span>
            <span className="migrate-v">
              Load chats from a file. Same-id chats are overwritten.
            </span>
          </div>
          <button
            className="ghost-sm migrate-import"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            hidden
          />
        </div>

        {status && <p className="migrate-status">{status}</p>}
      </div>
    </div>
  );
}
