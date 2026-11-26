import { pickInk } from './pick.ts';
import { noteRenderer } from './quality.ts';
import { FRAG, VERT } from './shader.ts';
import { Build, Field, fieldCopy, INK_UNIFORMS, InkUpload, locate, triangle, type Locations } from './uniforms.ts';

export type RGB = readonly [number, number, number];

export interface Drop {
  x: number;
  y: number;
  r: number;
  /** Palette index. */
  c: number;
}

/** Comb stroke: amplitude, spacing between teeth, angle, phase. */
export type Comb = [amp: number, spacing: number, angle: number, phase: number];

export interface Vortex {
  x: number;
  y: number;
  r: number;
  a: number;
}

export interface Stroke {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface InkState {
  /** Oldest first: each new drop pushes the ones before it aside. */
  drops: Drop[];
  /** Eight colours; 0 is the water, 7 the vein drawn around every drop. */
  palette: RGB[];
  comb: Comb;
  comb2: Comb;
  vortices: Vortex[];
  strokes: Stroke[];
  strokeRadius: number;
  /** Radial pulls that turn rings into a flower: count, depth, width, phase. */
  petal: [number, number, number, number];
  /** A negative `inner` limits the strokes to that radius, for a flower among other things. */
  petalAt: [x: number, y: number, inner: number, outer: number];
  /** Rings of sound through the ink: centre, amplitude, wavenumber. */
  ripple: [x: number, y: number, amp: number, k: number];
  rippleMod: [phase: number, reach: number];
  /** Slow current: amplitude, frequency, offset x, offset y. */
  warp: [number, number, number, number];
  shift: [number, number];
  /** Height of the view in ink units. */
  scale: number;
  /** Vein: width relative to its drop, then pixel limits. */
  vein: [rel: number, min: number, max: number];
  veinOpacity: number;
  pool: number;
  grain: number;
  water: number;
}

export interface InkPick {
  /** Index into `drops`, -1 for bare water. */
  index: number;
  color: number;
  /** Where a new drop has to fall to end up at this pixel once the strokes are applied. */
  x: number;
  y: number;
}

export interface View {
  /** Device pixels, origin bottom-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  state: InkState;
  /** The part of it that counts as the view, when the ink goes on around it. */
  rect?: Rect;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function inkState(init: Partial<InkState> & Pick<InkState, 'palette'>): InkState {
  return {
    drops: [],
    comb: [0, 1, 0, 0],
    comb2: [0, 1, 0, 0],
    vortices: [],
    strokes: [],
    strokeRadius: 0.1,
    petal: [5, 0, 0.1, 0],
    petalAt: [0, 0, 0, 0.3],
    ripple: [0, 0, 0, 40],
    rippleMod: [0, 0.4],
    warp: [0, 1, 0, 0],
    shift: [0, 0],
    scale: 1,
    vein: [0.02, 0.9, 2.2],
    veinOpacity: 0.92,
    pool: 0.1,
    grain: 0.024,
    water: 1,
    ...init,
  };
}

const VIEW_UNIFORMS = [...INK_UNIFORMS, 'uRect', 'uView'] as const;

/**
 * Ink on a canvas. The program is built in the background: until it is ready every call simply
 * does nothing and says so, and nobody has to wait.
 */
export class Marble {
  readonly canvas: HTMLCanvasElement;
  lost = false;
  /** The shader could not be built here. */
  broken = false;
  private gl: WebGL2RenderingContext;
  private build!: Build;
  private field!: Field;
  private loc: Locations<(typeof VIEW_UNIFORMS)[number]> | null = null;
  private data = new InkUpload();
  private loser: WEBGL_lose_context | null = null;
  private asleep = false;

  constructor(canvas: HTMLCanvasElement, options: { preserve?: boolean } = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: options.preserve ?? false,
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    noteRenderer(gl);
    this.start();
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
  }

  private onLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
  };

  private onRestored = () => {
    this.lost = false;
    this.start();
  };

  /** Gives the graphics memory back. Everything is built again by `rouse`. */
  sleep() {
    if (this.lost || this.asleep) return;
    this.loser ??= this.gl.getExtension('WEBGL_lose_context');
    if (!this.loser) return;
    this.asleep = true;
    this.loser.loseContext();
  }

  rouse() {
    if (!this.asleep) return;
    // The browser has to finish taking the context away before it can give it back.
    if (!this.lost) {
      window.setTimeout(() => this.rouse(), 60);
      return;
    }
    this.asleep = false;
    this.loser?.restoreContext();
  }

  private start() {
    const { gl } = this;
    this.loc = null;
    triangle(gl);
    this.field = new Field(gl);
    this.build = new Build(gl, VERT, FRAG);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  /** Moves on with whatever the driver has finished. True once the ink can be drawn. */
  prepare(): boolean {
    if (this.lost || this.broken) return false;
    if (this.loc) return true;
    try {
      if (!this.field.ready || !this.build.ready) return false;
    } catch (error) {
      this.broken = true;
      console.warn('ebru: the ink could not be built here.', error);
      return false;
    }
    const { gl } = this;
    this.loc = locate(gl, this.build.program, VIEW_UNIFORMS);
    // One pixel of nothing, so the first real picture finds everything in place.
    gl.useProgram(this.build.program);
    gl.viewport(0, 0, 1, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  /** Match the drawing buffer to the element; returns true when it changed. */
  resize(width: number, height: number): boolean {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.canvas.width === w && this.canvas.height === h) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    return true;
  }

  draw(state: InkState, time = 0, rect?: Rect): boolean {
    return this.drawViews([{ x: 0, y: 0, w: this.canvas.width, h: this.canvas.height, state, rect }], time);
  }

  /** Returns false while there is nothing to draw with yet. */
  drawViews(views: View[], time = 0): boolean {
    if (!this.prepare()) return false;
    const { gl } = this;
    const loc = this.loc!;
    gl.useProgram(this.build.program);
    gl.enable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (views.length > 1) gl.enable(gl.SCISSOR_TEST);
    for (const v of views) {
      if (v.w < 1 || v.h < 1) continue;
      gl.viewport(v.x, v.y, v.w, v.h);
      if (views.length > 1) gl.scissor(v.x, v.y, v.w, v.h);
      this.data.send(gl, loc, v.state, time);
      const r = v.rect ?? v;
      gl.uniform4f(loc.uRect, r.x, r.y, r.w, r.h);
      gl.uniform3f(loc.uView, v.state.shift[0], v.state.shift[1], v.state.scale);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return true;
  }

  /** The drop under a device pixel (origin bottom-left), or null while that cannot be known yet. */
  pick(state: InkState, x: number, y: number): InkPick | null {
    const field = fieldCopy();
    if (!field) {
      if (this.prepare()) this.field.askCopy();
      return null;
    }
    return pickInk(state, field, x, y, this.canvas.width, this.canvas.height);
  }

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    // A canvas that stays on the page may be used again; only a removed one gives its context back.
    const { gl, canvas } = this;
    window.setTimeout(() => {
      if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
    }, 0);
  }
}
