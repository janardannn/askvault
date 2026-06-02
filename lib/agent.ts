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
import { listNotes, readNote, searchVault } from "./vault-browser";
import { budgetFor, compactModelMessages, getContextLength } from "./context";

const INSTRUCTIONS = `You are askvault, an assistant that helps the user FIND notes in their Obsidian vault.

The user has granted read access to exactly one folder — their vault. You can only ever see notes inside it; nothing outside exists to you.

Your job is to locate and list relevant notes based on the user's question or the ongoing conversation. You can search note contents and filenames, list notes, and read a note to confirm relevance.

Rules:
- You are strictly read-only. You cannot create, edit, append to, rename, or delete notes — you have no tools to do so.
- When you reference a note, give its vault-relative path (e.g. "Projects/roadmap.md") so the user can open it.
- Prefer to actually search before answering. Use read_note only when you need to confirm relevance or summarize.
- Be concise. Present matches as a short list with a one-line reason each. If nothing matches, say so plainly.`;

export function createVaultAgent(
  apiKey: string,
  getModel: () => string,
  root: FileSystemDirectoryHandle,
  onCompact?: () => void,
) {
  const openrouter = createOpenRouter({ apiKey, appName: "askvault" });

  return new ToolLoopAgent({
    model: openrouter(getModel()),
    instructions: INSTRUCTIONS,
    stopWhen: stepCountIs(8),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepareCall: async ({ options, ...settings }: any) => {
      const model = getModel();
      const ctx = await getContextLength(model, apiKey);
      const budget = budgetFor(ctx);
      if (!Array.isArray(settings.messages)) {
        return { ...settings, model: openrouter(model) };
      }
      const compacted = compactModelMessages(settings.messages, budget);
      if (compacted.length < settings.messages.length) onCompact?.();
      return { ...settings, model: openrouter(model), messages: compacted };
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
          "List note paths in the vault. Use to browse what exists when a search is too narrow.",
        inputSchema: z.object({}),
        execute: async () => listNotes(root),
      }),
      read_note: tool({
        description:
          "Read the full contents of a single note by its vault-relative path. Use to confirm relevance or summarize.",
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
