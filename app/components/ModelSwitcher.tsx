"use client";

import { useEffect, useRef, useState } from "react";
import { MODELS, labelFor } from "@/lib/models";

export function ModelSwitcher({
  value,
  onChange,
  block = false,
}: {
  value: string;
  onChange: (model: string) => void;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
  }

  const known = MODELS.some((m) => m.id === value);

  return (
    <div className={`switcher ${block ? "switcher-block" : ""}`} ref={ref}>
      <button
        type="button"
        className="switcher-trigger"
        onClick={() => setOpen((o) => !o)}
        title={value}
      >
        <span className="dot" />
        {labelFor(value)}
        <svg width="11" height="11" viewBox="0 0 24 24" className="chev" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </button>

      {open && (
        <div className="switcher-menu">
          <div className="switcher-head">Model · free &amp; tool-capable</div>
          {MODELS.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`switcher-item ${m.id === value ? "sel" : ""}`}
              onClick={() => choose(m.id)}
            >
              <span className="si-main">{m.label}</span>
              <span className="si-note">{m.note}</span>
            </button>
          ))}
          {!known && (
            <button
              type="button"
              className="switcher-item sel"
              onClick={() => setOpen(false)}
            >
              <span className="si-main">Custom</span>
              <span className="si-note">{value}</span>
            </button>
          )}
          {/* not a <form> — this can be nested inside another form (onboarding) */}
          <div className="switcher-custom">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (custom.trim()) choose(custom.trim());
                }
              }}
              placeholder="any OpenRouter model id…"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => {
                if (custom.trim()) choose(custom.trim());
              }}
            >
              Use
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
