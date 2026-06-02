import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Read-only access layer for an Obsidian vault.
 *
 * SAFETY: This module only ever READS from disk (readdir / readFile / stat).
 * There is deliberately no write, append, rename, or delete function anywhere
 * here — so the model, which can only call what this module exposes, has no
 * capability to modify the vault.
 *
 * CONFINEMENT: A vault is opened against one root directory (the folder the
 * user explicitly picked). Every path is resolved and confirmed to live inside
 * that root, so neither the model nor a crafted "../" path can read anything
 * outside the chosen folder.
 */

// Folders we never descend into — Obsidian internals and VCS noise.
const IGNORED_DIRS = new Set([".obsidian", ".trash", ".git", "node_modules"]);

const MAX_FILES_SCANNED = 5000;
const MAX_SEARCH_RESULTS = 25;
const SNIPPET_CONTEXT = 1; // lines of context around a match
const MAX_NOTE_CHARS = 20000;

export interface SearchHit {
  path: string;
  matches: { line: number; text: string }[];
}

export interface NoteContent {
  path: string;
  content: string;
  truncated: boolean;
}

export interface Vault {
  readonly root: string;
  listNotes(subfolder?: string): Promise<string[]>;
  searchVault(query: string): Promise<SearchHit[]>;
  readNote(relativePath: string): Promise<NoteContent>;
}

/** Validate that a path is an existing directory we can use as a vault root. */
export async function isVaultDirectory(candidate: string): Promise<boolean> {
  if (!candidate || !path.isAbsolute(candidate)) return false;
  try {
    const info = await stat(candidate);
    return info.isDirectory();
  } catch {
    return false;
  }
}

/** Open a read-only vault confined to `root`. */
export function openVault(root: string): Vault {
  const VAULT_ROOT = path.resolve(root);

  /** Resolve a vault-relative path and guarantee it stays inside the vault. */
  function resolveInVault(relativePath: string): string {
    const resolved = path.resolve(VAULT_ROOT, relativePath);
    if (resolved !== VAULT_ROOT && !resolved.startsWith(VAULT_ROOT + path.sep)) {
      throw new Error(`Path "${relativePath}" is outside the selected vault.`);
    }
    return resolved;
  }

  function isMarkdown(name: string): boolean {
    return name.toLowerCase().endsWith(".md");
  }

  /** Recursively collect markdown note paths (relative to the vault root). */
  async function collectNotes(
    dir: string,
    acc: string[],
    limit: number,
  ): Promise<void> {
    if (acc.length >= limit) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (acc.length >= limit) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await collectNotes(full, acc, limit);
      } else if (entry.isFile() && isMarkdown(entry.name)) {
        acc.push(path.relative(VAULT_ROOT, full));
      }
    }
  }

  async function listNotes(subfolder = ""): Promise<string[]> {
    const start = resolveInVault(subfolder);
    const notes: string[] = [];
    await collectNotes(start, notes, MAX_FILES_SCANNED);
    return notes.sort();
  }

  async function searchVault(query: string): Promise<SearchHit[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const notes = await listNotes();
    const hits: SearchHit[] = [];

    for (const rel of notes) {
      if (hits.length >= MAX_SEARCH_RESULTS) break;

      const nameMatch = rel.toLowerCase().includes(needle);
      let content: string;
      try {
        content = await readFile(resolveInVault(rel), "utf8");
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

      if (nameMatch || matches.length > 0) {
        hits.push({ path: rel, matches });
      }
    }

    return hits;
  }

  async function readNote(relativePath: string): Promise<NoteContent> {
    const resolved = resolveInVault(relativePath);
    const info = await stat(resolved);
    if (!info.isFile()) {
      throw new Error(`"${relativePath}" is not a file.`);
    }
    const raw = await readFile(resolved, "utf8");
    const truncated = raw.length > MAX_NOTE_CHARS;
    return {
      path: relativePath,
      content: truncated ? raw.slice(0, MAX_NOTE_CHARS) : raw,
      truncated,
    };
  }

  return { root: VAULT_ROOT, listNotes, searchVault, readNote };
}
