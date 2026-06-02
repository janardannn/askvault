"use client";

import { useEffect, useRef, useState } from "react";
import {
  FREE_MODELS,
  AFFORDABLE_MODELS,
  PREMIUM_MODELS,
  MODELS,
  MODELS_UPDATED,
  labelFor,
  type ModelOption,
} from "@/lib/models";

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

  const Item = (m: ModelOption) => (
    <button
      type="button"
      key={m.id}
      className={`switcher-item ${m.id === value ? "sel" : ""}`}
      onClick={() => choose(m.id)}
    >
      <span className="si-main">{m.label}</span>
      <span className="si-note">{m.note}</span>
    </button>
  );

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
          <div className="sm-cols">
            <div className="sm-col">
              <div className="switcher-head">Free</div>
              {FREE_MODELS.map(Item)}
            </div>
            <div className="sm-col">
              <div className="switcher-head">Affordable</div>
              {AFFORDABLE_MODELS.map(Item)}
            </div>
            <div className="sm-col">
              <div className="switcher-head">Premium</div>
              {PREMIUM_MODELS.map(Item)}
            </div>
          </div>

          <div className="sm-current">
            current: <code>{value}</code>
            {!known && <span className="sm-custom-tag">custom</span>}
          </div>

          {/* not a <form> — safe to nest inside the onboarding form */}
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

          <div className="sm-updated">
            curated list · updated {MODELS_UPDATED}
          </div>
        </div>
      )}
    </div>
  );
}
