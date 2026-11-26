import { lightDevice } from './device.ts';

/**
 * One pixel ratio for every ink canvas, lowered when frames run long and raised again
 * only after a long calm stretch, so it never oscillates on a borderline GPU.
 */
const STEPS = [0.34, 0.45, 0.55, 0.7, 0.85, 1, 1.25, 1.5, 1.75];
/** Without a graphics card the processor paints every pixel: start small and stay modest. */
const SOFT_START = 0.45;
const SOFT_CEILING = 0.7;
/** With one, ink is never drawn with fewer pixels than the screen layout has, unless the picture crawls for seconds. */
const HARD_FLOOR = 1;
const CRAWL_FLOOR = 0.7;
const CRAWL = 0.045;
/** A phone has very small pixels: 1.5 for each point of the layout already looks sharp on it. */
const LIGHT = { floor: 0.85, start: 1.25, ceiling: 1.5 };

let index = -1;
let stageScale = 1;
let soft: boolean | null = null;

/** A stage that is laid out large and shown small only needs the pixels it is shown at. */
export function setStageScale(k: number) {
  stageScale = k;
}

let held = 0;

/** Fixes the pixel ratio, for pictures that must be sharp however long a frame takes, such as a PDF. */
export function holdRatio(r: number) {
  held = r;
}

let ceiling = -1;
let floor = 0;
let slow = 0;
let calm = 0;
let crawl = 0;
/** Calm frames before a softened picture gets its pixels back; longer every time it was needed. */
let patience = 300;

const listeners = new Set<() => void>();

function init() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const light = lightDevice();
  const most = soft ? SOFT_CEILING : light ? Math.min(dpr, LIGHT.ceiling) : dpr;
  ceiling = STEPS.reduce((best, s, i) => (s <= most + 0.01 ? i : best), 0);
  floor = soft ? 0 : Math.min(ceiling, STEPS.indexOf(light ? LIGHT.floor : HARD_FLOOR));
  // Start at the display ratio but never above 1.5: ink edges are antialiased analytically.
  index = soft ? STEPS.indexOf(SOFT_START) : Math.min(ceiling, STEPS.indexOf(light ? LIGHT.start : 1.5));
}

/** Called with the first context of the page: finds out whether a graphics card is behind it. */
export function noteRenderer(gl: WebGL2RenderingContext) {
  if (soft !== null) return;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  soft = /swiftshader|basic render|\bwarp\b|software|llvmpipe/i.test(name);
  index = -1;
  if (soft) listeners.forEach((f) => f());
}

/** True when the browser draws without the graphics card. */
export const softwareDrawing = () => soft === true;

/** Runs once it is known that there is no graphics card. */
export function onSoftware(f: () => void): () => void {
  if (soft) f();
  listeners.add(f);
  return () => listeners.delete(f);
}

export function pixelRatio(): number {
  if (held) return held * stageScale;
  if (index < 0) init();
  return STEPS[index] * stageScale;
}

/** Feed the time since the previous frame, in seconds, while ink is on screen. */
export function reportFrame(dt: number) {
  if (index < 0) init();
  // Ignore tab switches and long tasks: they say nothing about the GPU.
  if (dt > 0.25 || document.hidden) return;
  const budget = soft ? 0.042 : 0.0225;
  if (dt > budget) {
    slow = Math.min(60, slow + (dt > budget * 1.5 ? 2 : 1));
    calm = 0;
  } else {
    slow = Math.max(0, slow - 0.6);
    calm += 1;
  }
  crawl = dt > CRAWL ? crawl + 1 : Math.max(0, crawl - 0.5);
  if (slow > 36 && index > floor) {
    index -= 1;
    slow = 0;
    calm = 0;
    crawl = 0;
  } else if (!soft && crawl > 40 && index > STEPS.indexOf(CRAWL_FLOOR)) {
    index -= 1;
    crawl = 0;
    calm = 0;
    patience = Math.min(4800, patience * 2);
  } else if (calm > (index < floor ? patience : 1500) && index < ceiling) {
    index += 1;
    calm = 0;
  }
}

let beat = 0;
/** Without a graphics card ink moves every second frame, and the page itself stays fluid. */
export function skipFrame(): boolean {
  if (!soft) return false;
  return beat % 2 === 1;
}

if (typeof window !== 'undefined') {
  const count = () => {
    beat += 1;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
