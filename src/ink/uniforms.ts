import type { InkState } from './Marble.ts';
import { FIELD, FIELD_SIZE, MAX_DROPS, MAX_STROKES, VERT } from './shader.ts';

export const INK_UNIFORMS = [
  'uTime', 'uN', 'uD', 'uOwn', 'uPal', 'uComb', 'uComb2', 'uVort', 'uStroke', 'uStrokes', 'uStrokeK',
  'uPetal', 'uPetalAt', 'uRipple', 'uRippleMod', 'uWarp', 'uVein', 'uTone', 'uWater',
] as const;

export type Locations<K extends string> = Record<K, WebGLUniformLocation | null>;

/**
 * A program that the driver builds in the background. Asking anything about it before it is ready
 * would make the whole page wait for the compiler, so nobody asks.
 */
export class Build {
  readonly program: WebGLProgram;
  private gl: WebGL2RenderingContext;
  private shaders: [WebGLShader, WebGLShader];
  private parallel: KHR_parallel_shader_compile | null;
  private done = false;

  constructor(gl: WebGL2RenderingContext, vert: string, fragment: string) {
    this.gl = gl;
    this.parallel = gl.getExtension('KHR_parallel_shader_compile');
    const shader = (type: number, source: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      return sh;
    };
    this.program = gl.createProgram()!;
    this.shaders = [shader(gl.VERTEX_SHADER, vert), shader(gl.FRAGMENT_SHADER, fragment)];
    this.shaders.forEach((sh) => gl.attachShader(this.program, sh));
    if (vert === VERT) gl.bindAttribLocation(this.program, 0, 'a');
    gl.linkProgram(this.program);
  }

  /** True once the program can be used without waiting. Throws when it could not be built. */
  get ready(): boolean {
    if (this.done) return true;
    const { gl, program, parallel, shaders } = this;
    if (gl.isContextLost()) return false;
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shaders[1]) || gl.getShaderInfoLog(shaders[0]) || gl.getProgramInfoLog(program) || 'ink shader failed');
    }
    shaders.forEach((sh) => gl.deleteShader(sh));
    this.done = true;
    return true;
  }
}

export function locate<K extends string>(gl: WebGL2RenderingContext, program: WebGLProgram, names: readonly K[]): Locations<K> {
  const loc = {} as Locations<K>;
  for (const name of names) loc[name] = gl.getUniformLocation(program, name);
  return loc;
}

/** Fullscreen triangle on attribute 0. */
export function triangle(gl: WebGL2RenderingContext) {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

/** Side of the copy of the current that scripts can read. */
export const CPU_FIELD = 256;
let cpuField: Float32Array | null = null;
let cpuAsked = false;
/** The current as numbers (two per texel), once somebody has asked for it. */
export const fieldCopy = () => cpuField;

/** The slow current, baked into texture unit 0 of one context. Expects the fullscreen triangle to be bound. */
export class Field {
  private gl: WebGL2RenderingContext;
  private build: Build;
  private float: boolean;
  private baked = false;
  private reading: { buf: WebGLBuffer; sync: WebGLSync } | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.float = Boolean(gl.getExtension('EXT_color_buffer_float'));
    if (!this.float) gl.getExtension('EXT_color_buffer_half_float');
    this.build = new Build(gl, VERT, FIELD);
  }

  private bake(size: number): WebGLFramebuffer {
    const { gl } = this;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, this.float ? gl.RG32F : gl.RGBA16F, size, size);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.useProgram(this.build.program);
    gl.uniform1f(gl.getUniformLocation(this.build.program, 'uStep'), 8 / size);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, size, size);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return fbo;
  }

  get ready(): boolean {
    if (this.baked) return true;
    if (!this.build.ready) return false;
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    const fbo = this.bake(FIELD_SIZE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    this.baked = true;
    return true;
  }

  /** Copies the current to the processor in the background; the same copy serves every context. */
  askCopy() {
    const { gl } = this;
    if (cpuField || !this.baked) return;
    if (!this.reading) {
      if (cpuAsked) return;
      cpuAsked = true;
      // A small print on another unit, so the picture keeps its own.
      gl.activeTexture(gl.TEXTURE2);
      const fbo = this.bake(CPU_FIELD);
      const buf = gl.createBuffer()!;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, CPU_FIELD * CPU_FIELD * 16, gl.STREAM_READ);
      gl.readPixels(0, 0, CPU_FIELD, CPU_FIELD, gl.RGBA, gl.FLOAT, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
      gl.activeTexture(gl.TEXTURE0);
      this.reading = { buf, sync: gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)! };
      gl.flush();
      return;
    }
    const status = gl.clientWaitSync(this.reading.sync, 0, 0);
    if (status === gl.TIMEOUT_EXPIRED) return;
    if (status !== gl.WAIT_FAILED) {
      const all = new Float32Array(CPU_FIELD * CPU_FIELD * 4);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.reading.buf);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, all);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      cpuField = new Float32Array(CPU_FIELD * CPU_FIELD * 2);
      for (let i = 0; i < CPU_FIELD * CPU_FIELD; i += 1) {
        cpuField[i * 2] = all[i * 4];
        cpuField[i * 2 + 1] = all[i * 4 + 1];
      }
    } else cpuAsked = false;
    gl.deleteSync(this.reading.sync);
    gl.deleteBuffer(this.reading.buf);
    this.reading = null;
  }
}

/** Scratch arrays for sending an ink state to a program. */
export class InkUpload {
  private drops = new Float32Array(MAX_DROPS * 4);
  private own = new Float32Array(MAX_DROPS);
  private pal = new Float32Array(24);
  private vort = new Float32Array(16);
  private stroke = new Float32Array(MAX_STROKES * 4);

  send(gl: WebGL2RenderingContext, loc: Locations<(typeof INK_UNIFORMS)[number]>, state: InkState, time: number) {
    const n = Math.min(MAX_DROPS, state.drops.length);
    const from = state.drops.length - n;
    // The tag is one number: the ink (three bits) and how many older drops lie on the same spot.
    let older = 0;
    let area = 0;
    for (let i = 0; i < n; i += 1) {
      const d = state.drops[from + i];
      const before = i > 0 ? state.drops[from + i - 1] : null;
      const same = before !== null && before.x === d.x && before.y === d.y;
      older = same ? older + 1 : 0;
      area = (same ? area : 0) + d.r * d.r;
      this.drops[i * 4] = d.x;
      this.drops[i * 4 + 1] = d.y;
      this.drops[i * 4 + 2] = area;
      this.drops[i * 4 + 3] = d.c + older * 8;
      this.own[i] = d.r * d.r;
    }
    for (let i = 0; i < 8; i += 1) this.pal.set(state.palette[i], i * 3);
    this.vort.fill(0);
    state.vortices.slice(0, 4).forEach((v, i) => this.vort.set([v.x, v.y, v.r, v.a], i * 4));
    const strokes = state.strokes.slice(-MAX_STROKES);
    // Newest first, so the latest movement is undone first.
    strokes.forEach((s, i) => this.stroke.set([s.x, s.y, s.dx, s.dy], (strokes.length - 1 - i) * 4));
    gl.uniform1f(loc.uTime, time);
    gl.uniform1i(loc.uN, n);
    gl.uniform4fv(loc.uD, this.drops);
    gl.uniform4fv(loc.uOwn, this.own);
    gl.uniform3fv(loc.uPal, this.pal);
    gl.uniform4fv(loc.uComb, state.comb);
    gl.uniform4fv(loc.uComb2, state.comb2);
    gl.uniform4fv(loc.uVort, this.vort);
    gl.uniform4fv(loc.uStroke, this.stroke);
    gl.uniform1i(loc.uStrokes, strokes.length);
    gl.uniform1f(loc.uStrokeK, 1 / (state.strokeRadius * state.strokeRadius));
    gl.uniform4fv(loc.uPetal, state.petal);
    gl.uniform4fv(loc.uPetalAt, state.petalAt);
    gl.uniform4fv(loc.uRipple, state.ripple);
    gl.uniform2fv(loc.uRippleMod, state.rippleMod);
    gl.uniform4fv(loc.uWarp, state.warp);
    gl.uniform3fv(loc.uVein, state.vein);
    gl.uniform3f(loc.uTone, state.veinOpacity, state.pool, state.grain);
    gl.uniform1f(loc.uWater, state.water);
  }
}
