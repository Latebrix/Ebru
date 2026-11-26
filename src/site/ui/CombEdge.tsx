import { useEffect, useRef } from 'react';
import { pull } from '../../ink/comb.ts';
import { lightDevice } from '../../ink/device.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { gsap, scroll, ScrollTrigger } from '../motion.ts';
import './combedge.css';

interface Props {
  /** Colour of the section above. Without it the seam lies over that section instead of after it. */
  from?: string;
  /** Ink bands from the top down; the last one is the colour of the section below. */
  bands: string[];
  vein?: string;
  /** Teeth of the comb across a 1440 px screen. */
  teeth?: number;
  className?: string;
}

/**
 * The seam between two sections: bands of ink dragged into each other by a comb.
 * It opens the section it belongs to; the pull deepens as the seam crosses the screen.
 */
export function CombEdge({ from, bands, vein = '#f4ece0', teeth = 11, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const still = reducedMotion();
    let visible = false;
    let lastKey = '';
    let lean = 0;
    // Where the seam lies on the page; asking the browser every frame would make it lay out the page every frame.
    const box = { top: 0, width: 0, height: 0 };
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      box.top = r.top + window.scrollY;
      box.width = r.width;
      box.height = r.height;
      lastKey = '';
    };

    const draw = (time: number) => {
      const vh = window.innerHeight;
      // 0 when the seam appears at the bottom of the screen, 1 when it leaves at the top.
      const p = Math.min(1, Math.max(0, 1 - (box.top - scroll.y + box.height / 2) / (vh + box.height / 2)));
      lean += ((still ? 0 : scroll.velocity) - lean) * 0.12;
      const dpr = Math.min(window.devicePixelRatio || 1, lightDevice() ? 1.5 : 2);
      const w = Math.round(box.width * dpr);
      const h = Math.round(box.height * dpr);
      const key = `${w}|${h}|${p.toFixed(4)}|${lean.toFixed(3)}`;
      if (key === lastKey && Math.abs(lean) < 0.004) return;
      lastKey = key;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (from) {
        ctx.fillStyle = from;
        ctx.fillRect(0, 0, w, h);
      }
      const n = bands.length;
      const spacing = Math.max(84, box.width / Math.max(4, (teeth * box.width) / 1440)) * dpr;
      const grow = Math.min(1, Math.max(0, (p - 0.02) / 0.6));
      const ease = grow * grow * (3 - 2 * grow);
      const amp = h * 0.36 * (0.16 + 0.84 * ease);
      const step = 3 * dpr;
      const drift = lean * 0.5 * dpr + (still ? 0 : Math.sin(time * 0.4) * 2 * dpr);
      for (let i = 0; i < n; i += 1) {
        // Bands start stacked at the bottom and spread as the comb opens them.
        const rest = h * (0.97 - (n - 1 - i) * 0.045 * (0.4 + 0.6 * ease)) - amp * 0.55;
        const depth = amp * (1 - i * 0.07);
        const phase = 0.18 + i * 0.012;
        ctx.beginPath();
        ctx.moveTo(-10, h + 10);
        for (let x = -step; x <= w + step; x += step) {
          const u = (x + drift * (1 + i * 0.4)) / spacing + phase;
          const wave = Math.sin(x / (spacing * 2.7) + i * 0.5) * h * 0.018;
          ctx.lineTo(x, rest + pull(u) * depth * 0.62 + wave);
        }
        ctx.lineTo(w + 10, h + 10);
        ctx.closePath();
        ctx.fillStyle = bands[i];
        ctx.fill();
        if (vein !== bands[i]) {
          ctx.lineWidth = 1.6 * dpr;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = vein;
          ctx.stroke();
        }
      }
    };

    const tick = (time: number) => {
      if (visible) draw(time);
    };
    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) measure();
    });
    seen.observe(canvas);
    const sizes = new ResizeObserver(measure);
    sizes.observe(canvas);
    ScrollTrigger.addEventListener('refresh', measure);
    gsap.ticker.add(tick);
    return () => {
      seen.disconnect();
      sizes.disconnect();
      ScrollTrigger.removeEventListener('refresh', measure);
      gsap.ticker.remove(tick);
    };
  }, [from, bands, vein, teeth]);

  return <canvas ref={ref} className={`comb-edge ${from ? 'is-flow' : 'is-over'} ${className}`} aria-hidden="true" />;
}
