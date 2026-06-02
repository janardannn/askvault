"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  DEFAULT_MODEL,
  clearAll,
  clearVaultHandle,
  ensureReadPermission,
  loadKeyBlob,
  loadModel,
  loadVaultHandle,
  loadVaultLabel,
  saveKeyBlob,
  saveModel,
  saveVaultHandle,
  saveVaultLabel,
} from "@/lib/store";
import { Chat } from "./components/Chat";
import { Gem } from "./components/Gem";
import { ConstellationField } from "./components/ConstellationField";
import { ModelSwitcher } from "./components/ModelSwitcher";

type Phase = "loading" | "unsupported" | "setup" | "locked" | "pickFolder" | "ready";

export default function Page() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [vaultLabel, setVaultLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // setup form
  const [formKey, setFormKey] = useState("");
  const [formPass, setFormPass] = useState("");
  const [formPass2, setFormPass2] = useState("");
  const [formModel, setFormModel] = useState(DEFAULT_MODEL);
  // unlock form
  const [unlockPass, setUnlockPass] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);

  // cursor-following spotlight glow on the gate card
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    function onMove(e: PointerEvent) {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = card!.getBoundingClientRect();
        card!.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card!.style.setProperty("--my", `${e.clientY - r.top}px`);
        raf = 0;
      });
    }
    card.addEventListener("pointermove", onMove);
    return () => {
      card.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.showDirectoryPicker) {
      setPhase("unsupported");
      return;
    }
    setModel(loadModel());
    setVaultLabel(loadVaultLabel());
    setPhase(loadKeyBlob() ? "locked" : "setup");
  }, []);

  const pickFolder = useCallback(async () => {
    const picker = window.showDirectoryPicker;
    if (!picker) return null;
    const dir = await picker({ mode: "read", id: "askvault-vault" });
    await saveVaultHandle(dir);
    saveVaultLabel(dir.name);
    setVaultLabel(dir.name);
    return dir;
  }, []);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formKey.trim()) return setError("Enter your OpenRouter API key.");
    if (formPass.length < 6)
      return setError("Use a passphrase of at least 6 characters.");
    if (formPass !== formPass2) return setError("Passphrases don't match.");

    setBusy(true);
    try {
      const dir = await pickFolder();
      if (!dir) return;
      const blob = await encryptSecret(formKey.trim(), formPass);
      saveKeyBlob(blob);
      saveModel(formModel.trim() || DEFAULT_MODEL);
      setApiKey(formKey.trim());
      setModel(formModel.trim() || DEFAULT_MODEL);
      setHandle(dir);
      setFormKey("");
      setFormPass("");
      setFormPass2("");
      setPhase("ready");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // folder pick canceled
      setError("Could not complete setup. " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const blob = loadKeyBlob();
    if (!blob) return setPhase("setup");

    setBusy(true);
    try {
      const key = await decryptSecret(blob, unlockPass);
      setApiKey(key);
      setUnlockPass("");

      const stored = await loadVaultHandle();
      if (stored && (await ensureReadPermission(stored, { prompt: true }))) {
        setHandle(stored);
        setPhase("ready");
      } else {
        setPhase("pickFolder");
      }
    } catch {
      setError("Wrong passphrase.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReconnect() {
    setError(null);
    setBusy(true);
    try {
      const dir = await pickFolder();
      if (dir) {
        setHandle(dir);
        setPhase("ready");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError")
        setError("Could not open the folder.");
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    setApiKey("");
    setHandle(null);
    setUnlockPass("");
    setPhase("locked");
  }

  async function changeVault() {
    try {
      const dir = await pickFolder();
      if (dir) setHandle(dir);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError")
        console.error("Could not open the folder.", err);
    }
  }

  async function forget() {
    clearAll();
    await clearVaultHandle();
    setApiKey("");
    setHandle(null);
    setVaultLabel(null);
    setFormModel(DEFAULT_MODEL);
    setPhase("setup");
  }

  if (phase === "ready" && handle) {
    return (
      <Chat
        apiKey={apiKey}
        model={model}
        handle={handle}
        vaultLabel={vaultLabel ?? handle.name}
        onLock={lock}
        onChangeVault={changeVault}
      />
    );
  }

  return (
    <main className="gate">
      <div className="aurora" aria-hidden />
      <ConstellationField density={0.85} />
      <div className="gate-card glass spotlight" ref={cardRef}>
        <div className="brand">
          <Gem />
          <div>
            <h1>askvault</h1>
            <p className="tagline">Talk to your vault. It only ever reads.</p>
          </div>
        </div>

        {phase === "loading" && <p className="muted">Loading…</p>}

        {phase === "unsupported" && (
          <div className="block">
            <p>
              askvault reads your notes directly in the browser, which needs the{" "}
              <strong>File System Access API</strong>. Please open it in{" "}
              <strong>Chrome, Edge, Brave, or Arc</strong>.
            </p>
          </div>
        )}

        {phase === "setup" && (
          <form className="form" onSubmit={handleSetup}>
            <p className="lead">
              Everything stays on your machine. Your key is encrypted in this
              browser with a passphrase, and your notes are sent only to the
              model you choose — never to any server of ours.
            </p>
            <label>
              OpenRouter API key
              <input
                type="password"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="sk-or-v1-…"
                autoComplete="off"
              />
            </label>
            <label>
              Encryption passphrase
              <input
                type="password"
                value={formPass}
                onChange={(e) => setFormPass(e.target.value)}
                placeholder="used to encrypt your key on this device"
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm passphrase
              <input
                type="password"
                value={formPass2}
                onChange={(e) => setFormPass2(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label>
              Model
              <ModelSwitcher value={formModel} onChange={setFormModel} block />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Opening folder picker…" : "Choose vault folder & continue"}
            </button>
            <p className="fineprint">
              Next, your browser will ask you to pick your Obsidian folder and
              grant <strong>read-only</strong> access to it.
            </p>
          </form>
        )}

        {phase === "locked" && (
          <form className="form" onSubmit={handleUnlock}>
            <p className="lead">
              Welcome back. Enter your passphrase to unlock your encrypted key.
            </p>
            <label>
              Passphrase
              <input
                type="password"
                value={unlockPass}
                onChange={(e) => setUnlockPass(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Unlocking…" : "Unlock"}
            </button>
            <button type="button" className="ghost" onClick={forget}>
              Forget my key & start over
            </button>
          </form>
        )}

        {phase === "pickFolder" && (
          <div className="form">
            <p className="lead">
              Reconnect your vault — your browser needs to re-confirm read access
              to <strong>{vaultLabel ?? "your folder"}</strong>.
            </p>
            {error && <p className="error">{error}</p>}
            <button className="primary" onClick={handleReconnect} disabled={busy}>
              {busy ? "Opening…" : "Reconnect vault folder"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
