"use client";

import { useEffect, useRef } from "react";

/**
 * A living "knowledge constellation" — notes as drifting stars, proximity links
 * as constellation lines. Calm at rest; when `active` (the agent is searching)
 * it comes alive: faster drift, brighter and longer links, bigger bloom. The
 * intensity is eased, never switched, so the transition feels physical.
 *
 * Pure canvas 2D, DPR-aware, pointer-reactive, and accessible: it renders a
 * single static frame under prefers-reduced-motion and pauses when hidden.
 */

const ACCENT: [number, number, number] = [139, 108, 239]; // #8B6CEF
const SOFT: [number, number, number] = [173, 145, 247];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tw: number;
  twSpeed: number;
}

export function ConstellationField({
  active = false,
  density = 1,
}: {
  active?: boolean;
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let intensity = 0;
    let frameCount = 0;
    let raf = 0;
    let hidden = false;

    const pointer = { x: -9999, y: -9999, on: false };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function seed() {
      const target = Math.min(
        150,
        Math.max(30, Math.round(((width * height) / 15000) * density)),
      );
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: rand(-0.12, 0.12),
        vy: rand(-0.12, 0.12),
        r: rand(0.6, 1.9),
        tw: Math.random() * Math.PI * 2,
        twSpeed: rand(0.5, 1.5),
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduce) draw(false);
    }

    function draw(animate: boolean) {
      const ctx2 = ctx!;
      frameCount++;
      const target = activeRef.current ? 1 : 0;
      if (animate) intensity += (target - intensity) * 0.045;
      else intensity = activeRef.current ? 0.5 : 0.12;

      const speed = 1 + intensity * 1.7;
      const linkDist = 118 + intensity * 64;
      const linkAlpha = 0.16 + intensity * 0.24;

      ctx2.clearRect(0, 0, width, height);
      ctx2.globalCompositeOperation = "lighter";

      for (const p of particles) {
        if (animate) {
          p.x += p.vx * speed;
          p.y += p.vy * speed;
          if (p.x < -24) p.x = width + 24;
          else if (p.x > width + 24) p.x = -24;
          if (p.y < -24) p.y = height + 24;
          else if (p.y > height + 24) p.y = -24;
        }
        const twinkle = animate
          ? 0.6 + 0.4 * Math.sin(frameCount * 0.02 * p.twSpeed + p.tw)
          : 0.85;
        const a = (0.45 + intensity * 0.4) * twinkle;
        const r = p.r * (1 + intensity * 0.35) * 4;
        const g = ctx2.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(${SOFT[0]},${SOFT[1]},${SOFT[2]},${a})`);
        g.addColorStop(1, `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},0)`);
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx2.fill();
      }

      ctx2.lineWidth = 1;
      const linkDist2 = linkDist * linkDist;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist2) {
            const alpha = linkAlpha * (1 - Math.sqrt(d2) / linkDist);
            ctx2.strokeStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${alpha})`;
            ctx2.beginPath();
            ctx2.moveTo(a.x, a.y);
            ctx2.lineTo(b.x, b.y);
            ctx2.stroke();
          }
        }
        if (animate && pointer.on) {
          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const pd = 170;
          const d2 = dx * dx + dy * dy;
          if (d2 < pd * pd) {
            const alpha = (0.22 + intensity * 0.28) * (1 - Math.sqrt(d2) / pd);
            ctx2.strokeStyle = `rgba(${SOFT[0]},${SOFT[1]},${SOFT[2]},${alpha})`;
            ctx2.beginPath();
            ctx2.moveTo(a.x, a.y);
            ctx2.lineTo(pointer.x, pointer.y);
            ctx2.stroke();
          }
        }
      }
      ctx2.globalCompositeOperation = "source-over";
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      if (!hidden) draw(true);
    }

    function onMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.on = true;
    }
    function onLeave() {
      pointer.on = false;
      pointer.x = pointer.y = -9999;
    }
    function onVis() {
      hidden = document.hidden;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVis);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return <canvas ref={canvasRef} className="constellation" aria-hidden />;
}
