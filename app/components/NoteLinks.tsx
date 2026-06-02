"use client";

import React, { createContext, useContext } from "react";

/** obsidian://open deep link — opens the note in the user's Obsidian vault. */
export function obsidianHref(vault: string, path: string): string {
  const file = path.replace(/^\/+/, "");
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`;
}

export interface NoteIndex {
  vault: string;
  byPath: Map<string, string>; // lower-cased path/basename -> real path
  matcher: RegExp | null; // alternation of real note paths + unique basenames
}

const NoteCtx = createContext<NoteIndex | null>(null);
export const NoteLinksProvider = NoteCtx.Provider;
export function useNoteLinks(): NoteIndex | null {
  return useContext(NoteCtx);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a matcher from the real vault contents so only true notes become links. */
export function buildNoteIndex(vault: string, notes: string[]): NoteIndex {
  const byPath = new Map<string, string>();
  const baseCount = new Map<string, number>();
  for (const p of notes) {
    byPath.set(p.toLowerCase(), p);
    const base = (p.split("/").pop() ?? "").toLowerCase();
    baseCount.set(base, (baseCount.get(base) ?? 0) + 1);
  }
  const baseTerms: string[] = [];
  for (const p of notes) {
    const base = p.split("/").pop() ?? "";
    if (baseCount.get(base.toLowerCase()) === 1) {
      byPath.set(base.toLowerCase(), p); // resolve unique basename -> full path
      baseTerms.push(base);
    }
  }
  // longest-first so full paths win over bare filenames
  const terms = [...notes, ...baseTerms].sort((a, b) => b.length - a.length);
  const matcher = terms.length
    ? new RegExp(terms.map(escapeRe).join("|"), "gi")
    : null;
  return { vault, byPath, matcher };
}

/** Turn a plain string into nodes, wrapping any real note reference in an Obsidian link. */
export function linkify(text: string, idx: NoteIndex | null): React.ReactNode {
  if (!idx || !idx.matcher || !text.toLowerCase().includes(".md")) return text;
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  idx.matcher.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = idx.matcher.exec(text)) !== null) {
    const matched = m[0];
    const path = idx.byPath.get(matched.toLowerCase());
    if (m.index > last) out.push(text.slice(last, m.index));
    if (path) {
      out.push(
        <a
          key={key++}
          className="note-link"
          href={obsidianHref(idx.vault, path)}
          title={`Open ${path} in Obsidian`}
        >
          {matched}
        </a>,
      );
    } else {
      out.push(matched);
    }
    last = m.index + matched.length;
    if (m.index === idx.matcher.lastIndex) idx.matcher.lastIndex++; // guard against zero-width
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : text;
}

/** Apply linkify to the string parts of React children, passing elements through. */
export function linkifyChildren(
  children: React.ReactNode,
  idx: NoteIndex | null,
): React.ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? linkify(child, idx) : child,
  );
}

/** A standalone Obsidian link (used by tool activity + result cards with exact paths). */
export function NoteLink({
  path,
  children,
}: {
  path: string;
  children?: React.ReactNode;
}) {
  const idx = useNoteLinks();
  if (!idx) return <>{children ?? path}</>;
  return (
    <a
      className="note-link"
      href={obsidianHref(idx.vault, path)}
      title={`Open ${path} in Obsidian`}
    >
      {children ?? path}
    </a>
  );
}
