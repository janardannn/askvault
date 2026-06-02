/**
 * Our own context-window management. OpenRouter/the model keep no state — we
 * resend the whole history each turn — so as a conversation grows we must keep
 * it inside the model's context window ourselves.
 *
 * Strategy: look up the selected model's real context length, then before each
 * model call compact the history (drop oldest whole turns, keeping tool
 * call/result pairs intact) so it fits the budget. The on-screen transcript
 * stays complete; only what we *send* to the model is trimmed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const ctxCache: Record<string, number> = {};
let fetchedAll = false;

/** ~4 chars per token is a good cross-model estimate. */
export function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

function msgTokens(m: any): number {
  const content =
    typeof m?.content === "string" ? m.content : JSON.stringify(m?.content ?? "");
  return estimateTokens(content) + 4; // small per-message overhead
}

/** Fetch (once) and cache each model's context length from OpenRouter. */
export async function getContextLength(
  modelId: string,
  apiKey: string,
): Promise<number> {
  if (ctxCache[modelId]) return ctxCache[modelId];
  if (!fetchedAll) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = (await res.json())?.data as any[];
      for (const m of data ?? []) {
        if (m?.id && m?.context_length) ctxCache[m.id] = m.context_length;
      }
      fetchedAll = true;
    } catch {
      // offline / blocked — fall back to a safe default below
    }
  }
  return ctxCache[modelId] ?? 32000;
}

/** Leave room for tools + the response. */
export function budgetFor(contextLength: number): number {
  return Math.max(3000, Math.floor(contextLength * 0.65) - 1500);
}

/**
 * Compact a ModelMessage[] to fit `budget` tokens by dropping the oldest whole
 * turns (a "turn" starts at a user message), keeping system messages and the
 * most recent turns. Whole-turn granularity preserves tool-call/result pairing.
 */
export function compactModelMessages(messages: any[], budget: number): any[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const total =
    system.reduce((a, m) => a + msgTokens(m), 0) +
    rest.reduce((a, m) => a + msgTokens(m), 0);
  if (total <= budget) return messages;

  // group rest into turns starting at each user message
  const turns: any[][] = [];
  let cur: any[] = [];
  for (const m of rest) {
    if (m.role === "user" && cur.length) {
      turns.push(cur);
      cur = [];
    }
    cur.push(m);
  }
  if (cur.length) turns.push(cur);

  // keep most-recent turns that fit
  const sysTokens = system.reduce((a, m) => a + msgTokens(m), 0);
  let used = sysTokens;
  const kept: any[][] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i].reduce((a, m) => a + msgTokens(m), 0);
    if (used + t > budget && kept.length > 0) break;
    kept.unshift(turns[i]);
    used += t;
  }

  const trimmed = turns.length > kept.length;
  const note = trimmed
    ? [
        {
          role: "system",
          content:
            "[Earlier messages in this conversation were trimmed to fit the model's context window.]",
        },
      ]
    : [];

  return [...system, ...note, ...kept.flat()];
}
