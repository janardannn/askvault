"use client";

import { useEffect, useRef, useState } from "react";
import {
  FREE_MODELS,
  AFFORDABLE_MODELS,
  PREMIUM_MODELS,
  MODELS,
  MODELS_UPDATED,
  labelFor,
  costLabel,
  fmtCost,
  tierFor,
  type ModelOption,
} from "@/lib/models";
import { getModelPricing } from "@/lib/context";

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

  // resolve pricing for the current model — from the curated list if known,
  // else live from OpenRouter (so a custom-typed id still shows cost + tier)
  const [priceInfo, setPriceInfo] = useState<{ inCost: number; outCost: number } | null>(null);
  useEffect(() => {
    const m = MODELS.find((x) => x.id === value);
    if (m) {
      setPriceInfo({ inCost: m.inCost, outCost: m.outCost });
      return;
    }
    setPriceInfo(null);
    let alive = true;
    getModelPricing(value).then((p) => {
      if (alive) setPriceInfo(p);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function choose(id: string, keepOpen = false) {
    onChange(id);
    if (!keepOpen) setOpen(false); // custom input keeps it open to show the new price/tier
  }

  const known = MODELS.some((m) => m.id === value);

  const Item = (m: ModelOption) => (
    <button
      type="button"
      key={m.id}
      className={`switcher-item ${m.id === value ? "sel" : ""}`}
      onClick={() => choose(m.id)}
    >
      <span className="si-text">
        <span className="si-main">{m.label}</span>
        <span className="si-note">{m.note}</span>
      </span>
      <span className={`si-cost ${m.inCost === 0 ? "free" : ""}`}>
        {costLabel(m)}
      </span>
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
              <div className="switcher-head">
                Free <span className="sm-head-rule">$0</span>
              </div>
              {FREE_MODELS.map(Item)}
            </div>
            <div className="sm-col">
              <div className="switcher-head">
                Affordable <span className="sm-head-rule">≤$3 in · ≤$5 out</span>
              </div>
              {AFFORDABLE_MODELS.map(Item)}
            </div>
            <div className="sm-col">
              <div className="switcher-head">
                Premium <span className="sm-head-rule">pricier</span>
              </div>
              {PREMIUM_MODELS.map(Item)}
            </div>
          </div>

          <div className="sm-current">
            <span className="sm-cur-id">
              current: <code>{value}</code>
            </span>
            {priceInfo ? (
              <span className="sm-cur-price">
                {fmtCost(priceInfo.inCost, priceInfo.outCost)}
                <span
                  className={`sm-tier tier-${tierFor(priceInfo.inCost, priceInfo.outCost)}`}
                >
                  {tierFor(priceInfo.inCost, priceInfo.outCost)}
                </span>
              </span>
            ) : (
              !known && <span className="sm-cur-price sm-cur-unknown">checking price…</span>
            )}
          </div>

          {/* not a <form> — safe to nest inside the onboarding form */}
          <div className="switcher-custom">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (custom.trim()) choose(custom.trim(), true);
                }
              }}
              placeholder="any OpenRouter model id…"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => {
                if (custom.trim()) choose(custom.trim(), true);
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
