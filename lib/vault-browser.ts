/**
 * Read-only Obsidian vault access in the BROWSER, via the File System Access
 * API directory handle the user picked.
 *
 * SAFETY: We only ever read. We obtain the folder handle with `mode: "read"`,
 * and we only ever call `getDirectoryHandle` / `getFileHandle` (without
 * `{ create: true }`) and `getFile()`. We never call `createWritable`, so there
 * is no code path that can modify, create, or delete anything. The handle is
 * also scoped by the browser to exactly the folder the user chose — nothing
 * outside it is reachable.
 */

const IGNORED_DIRS = new Set([".obsidian", ".trash", ".git", "node_modules"]);
const MAX_FILES_SCANNED = 5000;
const MAX_SEARCH_RESULTS = 25;
const SNIPPET_CONTEXT = 1;
const MAX_NOTE_CHARS = 20_000;

export interface SearchHit {
  path: string;
  matches: { line: number; text: string }[];
}

export interface NoteContent {
  path: string;
  content: string;
  truncated: boolean;
}

function isMarkdown(name: string): boolean {
  return name.toLowerCase().endsWith(".md");
}

/** Recursively collect markdown note paths relative to the vault root. */
async function collectNotes(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  acc: string[],
): Promise<void> {
  if (acc.length >= MAX_FILES_SCANNED) return;
  // @ts-expect-error - async iterator on directory handles is standard but
  // not yet in TS lib.dom types.
  for await (const [name, handle] of dir.entries()) {
    if (acc.length >= MAX_FILES_SCANNED) return;
    const rel = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      if (IGNORED_DIRS.has(name)) continue;
      await collectNotes(handle as FileSystemDirectoryHandle, rel, acc);
    } else if (isMarkdown(name)) {
      acc.push(rel);
    }
  }
}

export async function listNotes(
  root: FileSystemDirectoryHandle,
): Promise<string[]> {
  const notes: string[] = [];
  await collectNotes(root, "", notes);
  return notes.sort();
}

/** Walk a vault-relative path to its file handle (read-only). */
async function fileHandleFor(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.some((p) => p === "..")) {
    throw new Error(`Illegal path "${relativePath}".`);
  }
  const fileName = parts.pop();
  if (!fileName) throw new Error(`Empty path.`);
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  return dir.getFileHandle(fileName);
}

async function readFileText(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<string> {
  const handle = await fileHandleFor(root, relativePath);
  const file = await handle.getFile();
  return file.text();
}

export async function searchVault(
  root: FileSystemDirectoryHandle,
  query: string,
): Promise<SearchHit[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const notes = await listNotes(root);
  const hits: SearchHit[] = [];

  for (const rel of notes) {
    if (hits.length >= MAX_SEARCH_RESULTS) break;

    const nameMatch = rel.toLowerCase().includes(needle);
    let content: string;
    try {
      content = await readFileText(root, rel);
    } catch {
      continue;
    }

    const lines = content.split("\n");
    const matches: { line: number; text: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(needle)) {
        const from = Math.max(0, i - SNIPPET_CONTEXT);
        const to = Math.min(lines.length - 1, i + SNIPPET_CONTEXT);
        matches.push({
          line: i + 1,
          text: lines.slice(from, to + 1).join("\n").slice(0, 400),
        });
        if (matches.length >= 5) break;
      }
    }

    if (nameMatch || matches.length > 0) hits.push({ path: rel, matches });
  }

  return hits;
}

export async function readNote(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<NoteContent> {
  const raw = await readFileText(root, relativePath);
  const truncated = raw.length > MAX_NOTE_CHARS;
  return {
    path: relativePath,
    content: truncated ? raw.slice(0, MAX_NOTE_CHARS) : raw,
    truncated,
  };
}
