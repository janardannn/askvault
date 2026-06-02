/** Persisted conversations — stored locally in IndexedDB, never server-side. */

import type { UIMessage } from "ai";
import { openDb, CHATS_STORE } from "./db";

export interface MetaEvt {
  id: string;
  kind: "model" | "compact" | "error";
  label?: string;
  reason?: string; // for error events
  model?: string; // for error events
  afterId: string | null;
}

export interface StoredChat {
  id: string;
  title: string;
  model: string;
  vaultLabel: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
  events?: MetaEvt[];
}

export function newChatId(): string {
  return crypto.randomUUID();
}

/** First user message → a short title. */
export function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 60 ? text.slice(0, 60) + "…" : text;
}

export async function listChats(): Promise<StoredChat[]> {
  const db = await openDb();
  const all = await new Promise<StoredChat[]>((resolve, reject) => {
    const tx = db.transaction(CHATS_STORE, "readonly");
    const req = tx.objectStore(CHATS_STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredChat[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getChat(id: string): Promise<StoredChat | null> {
  const db = await openDb();
  const chat = await new Promise<StoredChat | null>((resolve, reject) => {
    const tx = db.transaction(CHATS_STORE, "readonly");
    const req = tx.objectStore(CHATS_STORE).get(id);
    req.onsuccess = () => resolve((req.result as StoredChat) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return chat;
}

export async function putChat(chat: StoredChat): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CHATS_STORE, "readwrite");
    tx.objectStore(CHATS_STORE).put(chat);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteChat(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CHATS_STORE, "readwrite");
    tx.objectStore(CHATS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Import chats from an export file, merging by id. Returns how many imported. */
export async function importChats(raw: unknown): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arr: any[] = Array.isArray(raw)
    ? raw
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((raw as any)?.chats ?? []);
  let n = 0;
  for (const c of arr) {
    if (!c || typeof c.id !== "string" || !Array.isArray(c.messages)) continue;
    const incomingUpdatedAt = c.updatedAt ?? Date.now();
    // merge by id, last-write-wins: don't clobber a newer local chat with an older import
    const existing = await getChat(c.id);
    if (existing && existing.updatedAt >= incomingUpdatedAt) continue;
    await putChat({
      id: c.id,
      title: c.title ?? deriveTitle(c.messages),
      model: c.model ?? "",
      vaultLabel: c.vaultLabel ?? "imported",
      createdAt: c.createdAt ?? incomingUpdatedAt,
      updatedAt: incomingUpdatedAt,
      messages: c.messages,
      events: Array.isArray(c.events) ? c.events : [],
    });
    n++;
  }
  return n;
}

/**
 * Save a turn's messages, preserving the original createdAt and refreshing
 * updatedAt + title. Skips empty conversations.
 */
export async function saveTurn(params: {
  id: string;
  messages: UIMessage[];
  model: string;
  vaultLabel: string;
  events?: MetaEvt[];
}): Promise<void> {
  // never persist empty-parts stubs — they fail validateUIMessages on reload
  const messages = params.messages.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => Array.isArray(m?.parts) && m.parts.length > 0,
  );
  if (messages.length === 0) return;
  const existing = await getChat(params.id);
  const now = Date.now();
  await putChat({
    id: params.id,
    title: deriveTitle(messages),
    model: params.model,
    vaultLabel: params.vaultLabel,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages,
    events: params.events ?? existing?.events ?? [],
  });
}
