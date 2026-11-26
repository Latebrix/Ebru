import { gsap } from 'gsap';
import { useEffect, useRef, type RefObject } from 'react';
import { lightDevice } from './device.ts';
import { whenIdle } from './idle.ts';
import { Marble, type InkState, type Rect, type View } from './Marble.ts';
import { pixelRatio, reducedMotion, reportFrame, skipFrame, softwareDrawing } from './quality.ts';

export interface InkFrame {
  /** Seconds since this canvas first became visible; frozen for reduced motion. */
  t: number;
  dt: number;
  /** Device pixels. */
  w: number;
  h: number;
  /** Device pixels per CSS pixel. */
  ratio: number;
  marble: Marble;
}

export interface InkScene {
  /** Runs on every frame the canvas is on screen; returns what to draw. */
  frame(f: InkFrame): InkState | View[] | null;
  start?(el: HTMLCanvasElement): void | (() => void);
}

interface Options {
  /** Multiplies the shared pixel ratio. */
  scale?: number;
  /** Distance from the viewport at which the canvas is prepared at the latest. */
  margin?: string;
  /** While this returns false the canvas keeps its last frame. */
  running?: () => boolean;
  /** The part of the canvas that counts as the picture, in layout pixels from the bottom left; ink goes on around it. */
  rect?: () => Rect | null;
}

/** Seconds out of sight after which a canvas becomes small, and after which a small device lets go of it. */
const SMALL = 4;
const ASLEEP = 7;

/**
 * Binds an ink scene to a canvas: prepares it while the page is idle, runs it only while it is on
 * screen, follows its size and keeps the frame rate by lowering resolution.
 */
export function useInk<T extends InkScene>(ref: RefObject<HTMLCanvasElement | null>, make: () => T, options: Options = {}): RefObject<T> {
  const scene = useRef<T>(null as unknown as T);
  scene.current ??= make();
  const { scale = 1, margin = '70% 0px' } = options;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const still = reducedMotion();
    const light = lightDevice();
    let marble: Marble | null = null;
    let nearby = false;
    let visible = false;
    let hidden = 0;
    let t = 0;
    let box = { w: 0, h: 0 };
    let stop: void | (() => void);
    let disposed = false;

    const prepare = () => {
      if (marble || disposed) return;
      try {
        marble = new Marble(canvas);
      } catch {
        canvas.dataset.inkFailed = '';
        return;
      }
      stop = scene.current.start?.(canvas);
    };

    const draw = (dt: number) => {
      const s = scene.current;
      if (!marble) return;
      const ratio = pixelRatio() * scale;
      marble.resize(box.w * ratio, box.h * ratio);
      const r = options.rect?.();
      const rect = r ? { x: r.x * ratio, y: r.y * ratio, w: r.w * ratio, h: r.h * ratio } : undefined;
      const out = s.frame({ t, dt, w: rect?.w ?? canvas.width, h: rect?.h ?? canvas.height, ratio, marble });
      if (!out) return;
      if (Array.isArray(out)) marble.drawViews(out, t);
      else marble.draw(out, t, rect);
    };

    const tick = (_time: number, deltaMs: number) => {
      if (!marble) return;
      if (!visible) {
        hidden += deltaMs / 1000;
        if (hidden > SMALL && canvas.width > 2 && !options.running) marble.resize(1, 1);
        if (light && !nearby && hidden > ASLEEP && !options.running) marble.sleep();
        // Out of sight it still finishes its preparations.
        else if (hidden < 60) marble.prepare();
        return;
      }
      hidden = 0;
      if (options.running && !options.running()) return;
      // The story starts when there is ink to tell it with.
      if (!marble.prepare()) {
        if (marble.broken) canvas.dataset.inkFailed = '';
        return;
      }
      if (box.w === 0) return;
      if (skipFrame()) return;
      const dt = Math.min(0.05, deltaMs / 1000) * (softwareDrawing() ? 2 : 1);
      if (!still) {
        t += dt;
        reportFrame(deltaMs / 1000);
      }
      draw(still ? 0 : dt);
    };

    // Sizes are told, not asked for: asking would make the browser lay out the page every frame.
    const sizes = new ResizeObserver((entries) => {
      const r = entries[entries.length - 1].contentRect;
      box = { w: r.width, h: r.height };
    });
    sizes.observe(canvas);
    const near = new IntersectionObserver(
      (entries) => {
        nearby = entries[entries.length - 1].isIntersecting;
        if (!nearby) return;
        if (marble) marble.rouse();
        else prepare();
      },
      { rootMargin: margin },
    );
    const onScreen = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
      },
      { rootMargin: '4% 0px' },
    );
    near.observe(canvas);
    onScreen.observe(canvas);
    // A small device prepares a picture when it comes close, not before.
    const forget = light ? () => undefined : whenIdle(prepare);
    gsap.ticker.add(tick);

    return () => {
      disposed = true;
      forget();
      sizes.disconnect();
      near.disconnect();
      onScreen.disconnect();
      gsap.ticker.remove(tick);
      if (stop) stop();
      marble?.dispose();
    };
    // The scene factory is read once: scenes own their state.
  }, []);

  return scene;
}
