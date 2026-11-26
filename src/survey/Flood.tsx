import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { pull } from '../ink/comb.ts';
import { lightDevice } from '../ink/device.ts';
import { reducedMotion } from '../ink/quality.ts';
import { gsap } from '../site/motion.ts';

export interface FloodHandle {
  /**
   * The next colour rises from the bottom behind a combed seam of `bands` (top band first, the
   * last is the new colour), as the sections of the website meet. `covered` runs once the screen
   * is all new colour; the screen behind is changed then, and the flood is gone without a seam.
   */
  run(bands: string[], covered: () => void): void;
}

/** Seconds from the first band at the bottom to a covered screen. */
const RISE = 0.78;
const VEIN = '#f4ece0';

export const Flood = forwardRef<FloodHandle>(function Flood(_, handle) {
  const ref = useRef<HTMLCanvasElement>(null);
  const running = useRef<gsap.core.Tween | null>(null);

  useEffect(() => () => void running.current?.kill(), []);

  useImperativeHandle(handle, () => ({
    run(bands, covered) {
      const canvas = ref.current;
      running.current?.kill();
      if (!canvas || reducedMotion()) {
        covered();
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        covered();
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, lightDevice() ? 1.5 : 2);
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.visibility = 'visible';
      const n = bands.length;
      const seam = Math.min(h * 0.34, 300 * dpr);
      const spacing = Math.max(84 * dpr, w / Math.max(4, (11 * w) / (1440 * dpr)));
      const state = { p: 0 };
      let done = false;
      const draw = () => {
        // The top of the seam travels from below the screen to above it.
        const top = h + seam * 0.2 - state.p * (h + seam * 1.25);
        const open = Math.min(1, state.p * 1.6);
        const amp = seam * 0.5 * (0.35 + 0.65 * open);
        ctx.clearRect(0, 0, w, h);
        const step = 3 * dpr;
        for (let i = 0; i < n; i += 1) {
          const rest = top + i * seam * 0.16;
          const depth = amp * (1 - i * 0.08);
          ctx.beginPath();
          ctx.moveTo(-10, h + 10);
          for (let x = -step; x <= w + step; x += step) {
            const u = x / spacing + 0.18 + i * 0.012;
            ctx.lineTo(x, rest + pull(u) * depth * 0.62 + Math.sin(x / (spacing * 2.7) + i * 0.5) * seam * 0.02);
          }
          ctx.lineTo(w + 10, h + 10);
          ctx.closePath();
          ctx.fillStyle = bands[i];
          ctx.fill();
          if (bands[i] !== VEIN) {
            ctx.lineWidth = 1.6 * dpr;
            ctx.strokeStyle = VEIN;
            ctx.stroke();
          }
        }
        if (!done && top + (n - 1) * seam * 0.16 + amp < 0) {
          done = true;
          covered();
          ctx.clearRect(0, 0, w, h);
          canvas.style.visibility = 'hidden';
          running.current?.kill();
        }
      };
      running.current = gsap.to(state, {
        p: 1,
        duration: RISE * 1.3,
        ease: 'power2.inOut',
        onUpdate: draw,
        onComplete: () => {
          if (!done) {
            done = true;
            covered();
          }
          ctx.clearRect(0, 0, w, h);
          canvas.style.visibility = 'hidden';
        },
      });
    },
  }));

  return <canvas ref={ref} className="sv-flood" aria-hidden="true" />;
});
