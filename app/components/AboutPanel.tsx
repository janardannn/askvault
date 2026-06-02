"use client";

import { useEffect } from "react";
import { AboutContent } from "./AboutContent";

export function AboutPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="history-backdrop" onClick={onClose}>
      <div
        className="about-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="About askvault"
      >
        <button className="about-close" onClick={onClose} title="Close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="about-panel-scroll">
          <AboutContent />
        </div>
      </div>
    </div>
  );
}
