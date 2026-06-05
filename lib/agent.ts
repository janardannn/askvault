/**
 * Builds the in-browser agent. Everything here runs client-side: the model
 * call goes directly from the browser to OpenRouter with the user's own key,
 * and the tools read the local vault via the directory handle. No server is
 * involved, so note contents only ever reach OpenRouter — never us.
 *
 * The model is read dynamically via `getModel()` so switching models mid-chat
 * applies to the next turn without resetting the conversation. Before each
 * model call, `prepareCall` compacts the message history to fit the model's
 * context window.
 */

import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { listNotesWithMeta, readNote, searchVault } from "./vault-browser";
import { budgetFor, compactModelMessages, getContextLength } from "./context";

const INSTRUCTIONS = `You are askvault, an assistant that helps the user FIND notes in their Obsidian vault.

The user has granted read access to exactly one folder — their vault. You can only ever see notes inside it; nothing outside exists to you.

Your job is to locate and list relevant notes based on the user's question or the ongoing conversation. You can search note contents and filenames, list notes (with each note's last-edited date and size), and read a note (which also returns its last-edited date) to confirm relevance.

Rules:
- You are strictly read-only. You cannot create, edit, append to, rename, or delete notes — you have no tools to do so.
- When you reference a note, reproduce its vault-relative path EXACTLY as the tools returned it — character for character (e.g. "Projects/roadmap.md"). Never abbreviate or reformat it (do not shorten weekday or month names, drop ordinal suffixes, or change spacing/casing); the app only turns a verbatim path into a clickable link.
- Prefer to actually search before answering. Use read_note only when you need to confirm relevance or summarize.
- For time/date/recency/size questions, call list_notes — it returns every note's path, last-edited timestamp (modifiedAt, ISO) and size (sizeKB). Reason over the filenames and timestamps yourself to answer (filter/sort by date, find the latest, etc.).
- Only the last-edited date is available, not an OS creation date. For a note created and never edited, last-edited ≈ creation; creation recorded inside a note can be found by reading it.
- Be concise. Present matches as a short list with a one-line reason each. If nothing matches, say so plainly.`;

export function createVaultAgent(
  apiKey: string,
  getModel: () => string,
  root: FileSystemDirectoryHandle,
  onCompact?: () => void,
  getExtra?: () => string,
) {
  const openrouter = createOpenRouter({ apiKey, appName: "askvault" });

  return new ToolLoopAgent({
    model: openrouter(getModel()),
    instructions: INSTRUCTIONS,
    stopWhen: stepCountIs(8),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepareCall: async ({ options, ...settings }: any) => {
      const model = getModel();
      const ctx = await getContextLength(model);
      const budget = budgetFor(ctx);
      // user's extra behavior preferences (presets + free-form) — read live so
      // panel edits apply on the next turn; added ON TOP of the locked base.
      const extra = getExtra?.().trim();
      if (!Array.isArray(settings.messages)) {
        return { ...settings, model: openrouter(model) };
      }
      const compacted = compactModelMessages(settings.messages, budget);
      if (compacted.length < settings.messages.length) onCompact?.();
      const messages = extra
        ? [{ role: "system", content: extra }, ...compacted]
        : compacted;
      return { ...settings, model: openrouter(model), messages };
    },
    tools: {
      search_vault: tool({
        description:
          "Search the vault for notes whose filename or content matches a keyword or phrase (case-insensitive). Returns matching note paths with snippet lines.",
        inputSchema: z.object({
          query: z
            .string()
            .describe("Keyword or phrase to search for across notes."),
        }),
        execute: async ({ query }) => searchVault(root, query),
      }),
      list_notes: tool({
        description:
          "List every note in the vault WITH metadata: path, last-edited timestamp (modifiedAt, ISO 8601) and size (sizeKB). Use to browse, and especially to answer recency/date/size questions (most recently edited, edited on/around a date, biggest note) by reasoning over the returned metadata.",
        inputSchema: z.object({}),
        execute: async () => listNotesWithMeta(root),
      }),
      read_note: tool({
        description:
          "Read the full contents of a single note by its vault-relative path. Also returns the note's last-edited timestamp (modifiedAt). Use to confirm relevance or summarize.",
        inputSchema: z.object({
          path: z
            .string()
            .describe("Vault-relative path, e.g. 'Projects/roadmap.md'."),
        }),
        execute: async ({ path }) => readNote(root, path),
      }),
    },
  });
}
