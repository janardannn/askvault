/**
 * Local persistence — all on the user's machine, nothing server-side.
 *
 * - The encrypted API key blob + model preference live in localStorage.
 * - The picked vault's directory handle lives in IndexedDB (handles are
 *   structured-cloneable, so they survive reloads — the browser only re-asks
 *   for permission, not for the folder choice).
 */

import type { EncryptedBlob } from "./crypto";
import { openDb, HANDLES_STORE } from "./db";

const KEY_BLOB = "askvault.keyBlob";
const MODEL_PREF = "askvault.model";
const VAULT_LABEL = "askvault.vaultLabel";

export const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

// ---- localStorage: encrypted key + prefs ----------------------------------

export function saveKeyBlob(blob: EncryptedBlob): void {
  localStorage.setItem(KEY_BLOB, JSON.stringify(blob));
}

export function loadKeyBlob(): EncryptedBlob | null {
  const raw = localStorage.getItem(KEY_BLOB);
  return raw ? (JSON.parse(raw) as EncryptedBlob) : null;
}

export function clearAll(): void {
  localStorage.removeItem(KEY_BLOB);
  localStorage.removeItem(MODEL_PREF);
  localStorage.removeItem(VAULT_LABEL);
}

export function saveModel(model: string): void {
  localStorage.setItem(MODEL_PREF, model);
}

export function loadModel(): string {
  return localStorage.getItem(MODEL_PREF) || DEFAULT_MODEL;
}

export function saveVaultLabel(label: string): void {
  localStorage.setItem(VAULT_LABEL, label);
}

export function loadVaultLabel(): string | null {
  return localStorage.getItem(VAULT_LABEL);
}

// ---- IndexedDB: directory handle ------------------------------------------

const STORE_NAME = HANDLES_STORE;
const HANDLE_KEY = "vault";

export async function saveVaultHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  const handle = await new Promise<FileSystemDirectoryHandle | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () =>
        resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => reject(req.error);
    },
  );
  db.close();
  return handle;
}

export async function clearVaultHandle(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// ---- permissions -----------------------------------------------------------

/** Ensure we have READ (never write) permission on the vault folder. */
export async function ensureReadPermission(
  handle: FileSystemDirectoryHandle,
  { prompt = false } = {},
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: "read" };
  if ((await handle.queryPermission?.(opts)) === "granted") return true;
  if (prompt && (await handle.requestPermission?.(opts)) === "granted")
    return true;
  return false;
}
