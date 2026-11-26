import { useEffect, useRef, useState } from 'react';
import { lightDevice } from '../../ink/device.ts';
import { reducedMotion, softwareDrawing } from '../../ink/quality.ts';
import type { Squid } from '../../kalem/Squid.ts';
import { gsap, scroll } from '../motion.ts';
import { plop } from './sound.ts';

const W = 620;
const H = 320;

/**
 * Now and then a long arm rises over the bottom edge of the page, feels around and slips back.
 * Reach for it and it is gone. Its owner is introduced properly further down.
 */
export function ArmPeek({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Once the reader is far away the animal is let go; a new one comes if they return.
  const [life, setLife] = useState(0);

  useEffect(() => {
    if (!active || reducedMotion() || softwareDrawing() || lightDevice()) return;
    const canvas = ref.current!;
    let squid: Squid | null = null;
    let asked = false;
    let gone = false;
    const deep = H + 420;
    let t = 0;
    let out = 0;
    let wait = 9;

    const wake = () => {
      if (asked) return;
      asked = true;
      import('../../kalem/Squid.ts')
        .then(({ Squid: Animal }) => {
          if (gone) return;
          squid = new Animal(canvas, 1.02);
          squid.stage(W, H);
          // Head down, so only arms come over the edge.
          squid.roll = Math.PI;
          squid.yaw = 0.2;
          squid.place(W / 2, deep);
        })
        .catch(() => undefined);
    };

    const hide = () => {
      out = 0;
      squid?.release();
      wait = 15 + Math.random() * 9;
    };
    const shy = () => {
      if (out <= 0.4) return;
      plop(0.85, 0.5);
      hide();
    };
    canvas.addEventListener('pointerenter', shy);

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(0.033, deltaMs / 1000);
      if (scroll.y > window.innerHeight * 0.4) {
        if (out) hide();
        if (squid && scroll.y > window.innerHeight * 1.6) setLife((n) => n + 1);
        return;
      }
      if (!out) {
        wait -= dt;
        if (wait < 4) wake();
        if (wait < 0 && squid?.awake) out = 0.001;
        // Nothing to draw while it is all the way down.
        else if (!squid || squid.y > deep - 4) return;
      }
      if (!squid?.awake) return;
      t += dt;
      if (out) {
        out += dt;
        const x = W / 2;
        if (out < 1.1) squid.reachTo(3, -1, x - 80, H - 130, 40, -0.6);
        else if (out < 2.5) squid.reachTo(3, -1, x - 150 + 40 * Math.sin(out * 4), H - 186 + 16 * Math.sin(out * 6), 40, -0.8);
        else if (out < 3.6) squid.reachTo(3, 1, x + 110, H - 160 + 14 * Math.sin(out * 5), 40, 0.8);
        else if (out < 5.6) {
          squid.reachTo(3, -1, x - 130, H - 160 + 10 * Math.sin(out * 8), 40, -0.8);
          squid.reachTo(3, 1, x + 140 + 24 * Math.sin(out * 5), H - 206, 40, 0.9);
        } else hide();
      }
      squid.tx = W / 2;
      squid.ty = out ? H + 150 : deep + 30;
      squid.update(dt, t);
      squid.render(0, 0, W, H, Math.min(window.devicePixelRatio || 1, 1.5));
      canvas.style.pointerEvents = out > 0.4 ? 'auto' : 'none';
    };
    gsap.ticker.add(tick);
    return () => {
      gone = true;
      gsap.ticker.remove(tick);
      canvas.removeEventListener('pointerenter', shy);
      squid?.dispose();
    };
  }, [active, life]);

  return <canvas key={life} ref={ref} className="arm-peek" style={{ width: W, height: H }} aria-hidden="true" />;
}
