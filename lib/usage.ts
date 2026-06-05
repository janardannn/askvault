/**
 * Client-side estimate of how much of a model's context the current chat is
 * using — drives the navbar context ring.
 *
 * We estimate the tokens that would actually be SENT on the next turn, i.e.
 * AFTER the whole-turn sliding-window compaction in lib/context.ts. So the ring
 * reflects the model's real working view, not the full on-screen transcript:
 * it climbs as the chat grows and dips when older turns get trimmed once the
 * budget is full. (Because compaction slides rather than summarizes, it parks
 * near full rather than resetting to zero.)
 */

import { budgetFor, cachedContextLength, estimateTokens } from "./context";

/* eslint-disable @typescript-eslint/no-explicit-any */

// The locked base instructions cost a couple hundred tokens; counted so the
// ring doesn't read as empty on a brand-new chat.
const SYSTEM_TOKENS = 240;

function partTokens(part: any): number {
  if (!part) return 0;
  if (part.type === "text") return estimateTokens(part.text ?? "");
  // tool calls/results are real tokens too — count their input + output
  const io =
    (part.input ? JSON.stringify(part.input) : "") +
    (part.output ? JSON.stringify(part.output) : "");
  return estimateTokens(io);
}

function messageTokens(m: any): number {
  const parts = Array.isArray(m?.parts) ? m.parts : [];
  return parts.reduce((a: number, p: any) => a + partTokens(p), 0) + 4;
}

export interface CtxUsage {
  used: number; // estimated tokens sent next turn
  budget: number; // compaction budget for the model
  window: number; // model's full context length
  pct: number; // used / budget, 0–100 (clamped)
}

/** Estimate the tokens sent next turn for `model`, mirroring the whole-turn
 *  sliding window in compactModelMessages. */
export function contextUsage(messages: any[], model: string): CtxUsage {
  const window = cachedContextLength(model);
  const budget = budgetFor(window);
  const msgs = Array.isArray(messages) ? messages : [];

  const total = msgs.reduce((a, m) => a + messageTokens(m), SYSTEM_TOKENS);
  let used = total;

  if (total > budget) {
    // group into turns (a turn starts at a user message), keep the most recent
    const turns: any[][] = [];
    let cur: any[] = [];
    for (const m of msgs) {
      if (m.role === "user" && cur.length) {
        turns.push(cur);
        cur = [];
      }
      cur.push(m);
    }
    if (cur.length) turns.push(cur);

    used = SYSTEM_TOKENS;
    const kept: any[][] = [];
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i].reduce((a, m) => a + messageTokens(m), 0);
      if (used + t > budget && kept.length > 0) break;
      kept.unshift(turns[i]);
      used += t;
    }
  }

  const pct = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  return { used, budget, window, pct };
}

/** Compact token label: 1240 -> "1.2k", 24000 -> "24k". */
export function fmtTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}
