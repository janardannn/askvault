"use client";

import { fmtTokens, type CtxUsage } from "@/lib/usage";

/** Live navbar gauge: how full the model's working context is for this chat.
 *  Green -> amber -> red as it fills; clicking opens the agent & context panel. */
export function ContextRing({
  usage,
  onClick,
}: {
  usage: CtxUsage;
  onClick: () => void;
}) {
  const { pct, used, budget, window: win } = usage;
  const r = 8.5;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const tier = pct >= 88 ? "hot" : pct >= 65 ? "warm" : "cool";
  const title =
    `Context: ${pct}% of working budget\n` +
    `~${fmtTokens(used)} / ${fmtTokens(budget)} tokens · model window ${fmtTokens(win)}\n` +
    `Click for agent & context settings`;

  return (
    <button
      type="button"
      className={`ctx-ring ctx-${tier}`}
      onClick={onClick}
      title={title}
      aria-label={`Context ${pct}% used — open agent settings`}
    >
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <circle className="ctx-track" cx="15" cy="15" r={r} />
        <circle
          className="ctx-fill"
          cx="15"
          cy="15"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={off}
          transform="rotate(-90 15 15)"
        />
      </svg>
      <span className="ctx-num">{pct}</span>
    </button>
  );
}
