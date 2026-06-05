"use client";

import { useEffect } from "react";
import {
  BEHAVIOR_PRESETS,
  UTILITY_PRESETS,
  type AgentConfig,
  type AgentPreset,
} from "@/lib/agent-config";
import { fmtTokens, type CtxUsage } from "@/lib/usage";

/** The panel the context ring opens: live context readout + agent behavior
 *  customization (presets + free-form), layered on the locked base prompt. */
export function AgentPanel({
  usage,
  config,
  onChange,
  onClose,
}: {
  usage: CtxUsage;
  config: AgentConfig;
  onChange: (c: AgentConfig) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (id: string) => {
    const on = config.presets.includes(id);
    onChange({
      ...config,
      presets: on
        ? config.presets.filter((p) => p !== id)
        : [...config.presets, id],
    });
  };

  const { pct, used, budget, window: win } = usage;
  const tier = pct >= 88 ? "hot" : pct >= 65 ? "warm" : "cool";

  const pills = (presets: AgentPreset[]) => (
    <div className="agent-pills">
      {presets.map((p) => {
        const on = config.presets.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            className={`agent-pill ${on ? "on" : ""}`}
            onClick={() => toggle(p.id)}
            title={p.hint}
            aria-pressed={on}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="history-backdrop" onClick={onClose}>
      <div
        className="agent-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Agent and context settings"
      >
        <button
          className="about-close"
          onClick={onClose}
          title="Close"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="agent-scroll">
          <h2 className="agent-title">Agent &amp; context</h2>

          <section className={`agent-ctx ctx-${tier}`}>
            <div className="agent-ctx-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="agent-ctx-row">
              <strong>{pct}%</strong>
              <span className="muted">
                of working budget · ~{fmtTokens(used)} / {fmtTokens(budget)} tokens
              </span>
            </div>
            <p className="agent-ctx-note muted">
              Model window {fmtTokens(win)} tokens. Once the budget fills, the
              oldest turns are trimmed from what the model sees — the on-screen
              chat stays whole.
            </p>
          </section>

          <section className="agent-section">
            <h3>Utility</h3>
            <p className="muted agent-sub">
              How notes are found, filtered, and formatted.
            </p>
            {pills(UTILITY_PRESETS)}
          </section>

          <hr className="agent-divider" />

          <section className="agent-section">
            <h3>Personality</h3>
            <p className="muted agent-sub">
              The lens and tone askvault brings to your notes. Layered on the
              locked, read-only base prompt — these only add guidance, mix freely.
            </p>
            {pills(BEHAVIOR_PRESETS)}
          </section>

          <hr className="agent-divider" />

          <section className="agent-section">
            <h3>Extra instructions</h3>
            <textarea
              className="agent-custom"
              value={config.custom}
              onChange={(e) => onChange({ ...config, custom: e.target.value })}
              placeholder="e.g. Answer in the same voice as my notes. Group results by month. Flag anything that reads like a recurring worry."
              spellCheck={false}
              rows={4}
            />
            <p className="muted agent-foot">
              Saved on this device and applied to every chat. Changes take effect
              on your next message.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
