import {
  BackSide, BufferAttribute, BufferGeometry, CanvasTexture, Color, CustomBlending, DataTexture, DoubleSide, Euler, FloatType, FrontSide, Group, InstancedBufferAttribute,
  InstancedBufferGeometry, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, MirroredRepeatWrapping, NoColorSpace, OneFactor,
  OneMinusSrcAlphaFactor, PerspectiveCamera, PlaneGeometry, Quaternion, RGBAFormat, Scene, ShaderMaterial, SphereGeometry, Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { C, HEX, ON_WATER } from '../brand/palette.ts';
import { breath } from '../ink/idle.ts';
import { inkState, type Drop, type InkState } from '../ink/Marble.ts';
import { softwareDrawing } from '../ink/quality.ts';
import { clamp, lerp, rng, smooth } from '../ink/random.ts';
import { inkTexture } from '../ink/texture.ts';
import { ARMS, armRadius, EYE_AT, finGeometry, funnelGeometry, headGeometry, mantleGeometry, type ArmPlan } from './anatomy.ts';
import { ARM_INKS } from './inks.ts';
import { CUP_FRAG, CUP_VERT, EYE_FRAG, EYE_VERT, LINE_FRAG, PLUME_FRAG, PLUME_VERT, SKIN_FRAG, SKIN_VERT } from './skin.ts';

/**
 * Kalem is a squid. The word is Turkish for pen and the root of calamari, the animal that carries a
 * pen and ink. Five pairs of arms, one pair for each teammate, and a coat of everybody's colour.
 *
 * Positions are CSS pixels on a stage; the body is real geometry in perspective above it.
 */
const JOINTS = 40;
const RADIAL = 14;
const FOV = 24;
/** Pixels per body unit at scale 1. */
const UNIT = 104;
const PLUMES = 56;
/** Size of the marbled paper on the mantle, pixels. */
const PAINT = 1024;
const CUPS_PER_ARM = 15;

const DEEP = ['#1a27b0', '#cc2f17', '#e57f14', '#e0598f', '#08695f'];
const PALE = ['#7e89ff', '#ffa48f', '#ffd794', '#ffcfe2', '#6ccfc3'];
export type Mood = 'calm' | 'curious' | 'surprised' | 'shy' | 'glad';

interface Arm {
  plan: ArmPlan;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  vz: Float32Array;
  seed: number;
  reach: number;
  reachGoal: number;
  target: Vector3;
  bend: number;
  lift: number;
  liftGoal: number;
  curl: number;
  curlGoal: number;
  wag: number;
  wagGoal: number;
}

interface Plume {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  age: number;
  life: number;
  color: Color;
  core: Color;
  seed: [number, number, number, number];
}

const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();
const q1 = new Quaternion();
const q2 = new Quaternion();
const e1 = new Euler();
const m1 = new Matrix4();
const Z = new Vector3(0, 0, 1);

const color = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, NoColorSpace);
};

/** The picture its coat repeats: bands of everybody's ink, then rings, then a comb drawn toward the tip. */
function coat(): InkState {
  const r = rng(14);
  const order = [C.verm, C.blue, C.saff, C.teal, C.pink, C.bone];
  const drops: Drop[] = [];
  for (let i = 0; i < 26; i += 1) drops.push({ x: (r() - 0.5) * 1.3, y: (r() - 0.5) * 1.3, r: 0.14 + r() * 0.1, c: order[(i * 5 + 1) % 5] });
  for (let k = 0; k < 7; k += 1) {
    const x = (r() - 0.5) * 0.9;
    const y = (r() - 0.5) * 0.9;
    let q = 0.16;
    for (let j = 0; j < 4; j += 1) {
      drops.push({ x, y, r: q, c: [C.bone, order[k % 5], C.water, order[(k + 2) % 5]][j] });
      q *= 0.72;
    }
  }
  for (let i = 0; i < 18; i += 1) drops.push({ x: (r() - 0.5) * 1, y: (r() - 0.5) * 1, r: 0.015 + r() * 0.045, c: i % 3 ? order[i % 5] : C.water });
  return inkState({ palette: ON_WATER, drops, warp: [0.1, 1.2, 0, 0], comb: [0.24, 0.125, 0, 0.1], vein: [0.012, 1.1, 2.6], grain: 0, pool: 0 });
}

/** Printed once, off the screen, and shared by every Kalem on the page. */
async function coatTexture(): Promise<Texture> {
  let map: Texture;
  try {
    const url = await inkTexture('kalem-coat', PAINT, PAINT, coat);
    const bitmap = await createImageBitmap(await (await fetch(url)).blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    map = new Texture(bitmap);
    map.flipY = false;
  } catch {
    const flat = document.createElement('canvas');
    flat.width = flat.height = 4;
    const c = flat.getContext('2d')!;
    c.fillStyle = HEX.verm;
    c.fillRect(0, 0, 4, 4);
    map = new CanvasTexture(flat);
  }
  map.colorSpace = NoColorSpace;
  map.wrapS = map.wrapT = MirroredRepeatWrapping;
  map.minFilter = LinearMipmapLinearFilter;
  map.magFilter = LinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 8;
  map.needsUpdate = true;
  return map;
}

export class Squid {
  /** Centre of the head on the stage, CSS pixels; z is toward the viewer. */
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  tx = 0;
  ty = 0;
  tz = 0;
  scale: number;
  /** Rest attitude: turn around its own axis, nod, and lean on screen. */
  yaw = -0.98;
  pitch = 0.1;
  roll = -0.62;
  lean = 0;
  lookX = 0;
  lookY = 0;
  voice = 0;
  urge = 1;
  mood: Mood = 'calm';
  /** Width of the contour, pixels at scale 1. */
  line = 2.1;
  /** Emphasis per pair of arms, 0..1. */
  readonly lit = [0, 0, 0, 0, 0];
  blush = 0;

  readonly arms: Arm[];
  readonly canvas: HTMLCanvasElement;
  /** Built in small steps while the page is idle; nothing is drawn before it is complete. */
  awake = false;
  /** Somebody is already looking: no more breaks between the steps. */
  urgent = false;
  private renderer: WebGLRenderer | null = null;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 1, 6000);
  private body = new Group();
  private bones = new DataTexture(new Float32Array(JOINTS * ARMS.length * 3 * 4), JOINTS, ARMS.length * 3, RGBAFormat, FloatType);
  private eyes: Mesh[] = [];
  private plumeMesh!: InstancedMesh;
  private plumes: Plume[] = [];
  private shared!: Record<string, { value: unknown }>;
  private unitUniform = { value: UNIT };
  private scaleUniform = { value: UNIT };
  private bend = new Vector2();
  private bendV = new Vector2();
  private squeeze = 0;
  private squeezeV = 0;
  private att = { yaw: -0.98, pitch: 0.1, roll: -0.62, vy: 0, vp: 0, vr: 0 };
  private gaze = [new Vector3(1, 0, 0.3), new Vector3(-1, 0, 0.3)];
  private gazeNow = new Vector2();
  private pupil = 0.5;
  private litNow = [0, 0, 0, 0, 0];
  private blushNow = 0;
  private stageW = 1;
  private stageH = 1;
  private t = 0;
  private ready = false;
  private talk = 0;
  private talkIn = 0;
  private lastVoice = 0;
  private paint: Texture | null = null;
  private quat = new Quaternion();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, scale = 1) {
    this.canvas = canvas;
    this.scale = scale;
    this.arms = ARMS.map((plan, i) => ({
      plan,
      x: new Float32Array(JOINTS), y: new Float32Array(JOINTS), z: new Float32Array(JOINTS),
      vx: new Float32Array(JOINTS), vy: new Float32Array(JOINTS), vz: new Float32Array(JOINTS),
      seed: i * 1.37,
      reach: 0, reachGoal: 0, target: new Vector3(), bend: 1,
      lift: 0, liftGoal: 0, curl: 0, curlGoal: 0, wag: 0, wagGoal: 0,
    }));
    void this.wake().catch((error: unknown) => {
      canvas.dataset.inkFailed = '';
      console.warn('ebru: Kalem could not be drawn here.', error);
    });
  }

  /** One small step after another, each with a breath before it, so the page never stops for it. */
  private async wake() {
    const coming = coatTexture();
    await this.breath();
    if (this.disposed) return;
    const renderer = new WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: !softwareDrawing(), premultipliedAlpha: true, powerPreference: 'high-performance' });
    this.renderer = renderer;
    // Asking for compiler messages would make the page wait for the compiler.
    renderer.debug.checkShaderErrors = false;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    const steps = [this.dress, this.buildBody, this.buildFace, this.buildArms, this.buildCups, this.buildPlumes];
    for (const step of steps) {
      await this.breath();
      if (this.disposed) return;
      step.call(this);
    }
    const map = await coming;
    if (this.disposed) return;
    this.paint = map;
    this.shared.uPaint.value = map;
    await renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    await this.breath();
    if (this.disposed) return;
    // Everything travels to the graphics card with one very small picture.
    renderer.setSize(2, 2, false);
    renderer.render(this.scene, this.camera);
    this.awake = true;
  }

  private breath() {
    return this.urgent ? Promise.resolve() : breath();
  }

  private dress() {
    this.shared = {
      uPaint: { value: null },
      uTime: { value: 0 },
      uVoice: { value: 0 },
      uBlush: { value: 0 },
      uLine: { value: this.line },
      uUnit: { value: UNIT },
      uBone: { value: color(HEX.bone) },
      uDark: { value: color(HEX.ink) },
      uSaff: { value: color(HEX.saff) },
      uVerm: { value: color(HEX.verm) },
      uDeep: { value: DEEP.map(color) },
      uPale: { value: PALE.map(color) },
      uBend: { value: this.bend },
      uSqueeze: { value: 0 },
      uInk: { value: ARM_INKS.map((n) => color(HEX[n])) },
      uLit: { value: this.litNow },
      uBones: { value: this.bones },
      uScale: this.scaleUniform,
    };
    this.scene.add(this.body);
  }

  private skin(part: number, defines: Record<string, string>, side: typeof DoubleSide | typeof FrontSide) {
    return new ShaderMaterial({ vertexShader: SKIN_VERT, fragmentShader: SKIN_FRAG, uniforms: this.shared, defines: { ...defines, PART: String(part) }, side });
  }

  /** The same shape a little larger and inside out: what sticks out is the drawn contour. */
  private contour(defines: Record<string, string>, unit: { value: unknown }) {
    return new ShaderMaterial({ vertexShader: SKIN_VERT, fragmentShader: LINE_FRAG, uniforms: { ...this.shared, uUnit: unit }, defines: { ...defines, LINE: '' }, side: BackSide });
  }

  private part(g: BufferGeometry, part: number, side: typeof DoubleSide | typeof FrontSide): Mesh {
    const mesh = new Mesh(g, this.skin(part, { BODY: '' }, side));
    mesh.frustumCulled = false;
    const line = new Mesh(g, this.contour({ BODY: '' }, this.unitUniform));
    line.frustumCulled = false;
    mesh.add(line);
    this.body.add(mesh);
    return mesh;
  }

  private buildBody() {
    this.part(mantleGeometry(), 0, FrontSide);
    for (const side of [-1, 1] as const) {
      const fin = new Mesh(finGeometry(side), this.skin(2, { BODY: '', FIN: '' }, DoubleSide));
      fin.frustumCulled = false;
      this.body.add(fin);
    }
  }

  private buildFace() {
    // Head and funnel share one program.
    this.part(headGeometry(), 1, DoubleSide);
    const funnel = this.part(funnelGeometry(), 1, DoubleSide);
    funnel.position.set(0, -0.06, -0.33);
    funnel.rotation.x = 0.42;
    for (const side of [1, -1] as const) {
      const g = new SphereGeometry(EYE_AT.r, 40, 28);
      const eye = new Mesh(
        g,
        new ShaderMaterial({ vertexShader: EYE_VERT, fragmentShader: EYE_FRAG, uniforms: { ...this.shared, uGaze: { value: this.gaze[side === 1 ? 0 : 1] }, uPupil: { value: 0.5 } } }),
      );
      eye.position.set(side * EYE_AT.x, EYE_AT.y, EYE_AT.z);
      this.eyes.push(eye);
      eye.add(new Mesh(g, new ShaderMaterial({ vertexShader: EYE_VERT, fragmentShader: LINE_FRAG, uniforms: { ...this.shared, uUnit: this.unitUniform }, defines: { LINE: '' }, side: BackSide })));
      this.body.add(eye);
    }
  }

  private buildArms() {
    const ring = RADIAL + 1;
    const count = ARMS.length * JOINTS * ring;
    const g = new BufferGeometry();
    const rest = new Float32Array(count * 3);
    const skinUv = new Float32Array(count * 2);
    const pair = new Float32Array(count);
    const bone = new Float32Array(count * 4);
    const girth = new Float32Array(count);
    const index: number[] = [];
    ARMS.forEach((a, i) => {
      for (let j = 0; j < JOINTS; j += 1) {
        const u = j / (JOINTS - 1);
        const r = armRadius(a, u);
        for (let k = 0; k < ring; k += 1) {
          const o = (i * JOINTS + j) * ring + k;
          const th = (k / RADIAL) * Math.PI * 2;
          rest.set([Math.sin(a.phi) * 0.2 + Math.cos(th) * r + i * 3.1, -0.5 - u * a.length, Math.cos(a.phi) * 0.2 + Math.sin(th) * r], o * 3);
          skinUv.set([u, k / RADIAL], o * 2);
          bone.set([i, j, Math.cos(th), Math.sin(th)], o * 4);
          girth[o] = r;
          pair[o] = a.pair;
          if (j < JOINTS - 1 && k < RADIAL) index.push(o, o + 1, o + ring, o + 1, o + ring + 1, o + ring);
        }
      }
    });
    // The shape itself is made on the graphics card, from the joints.
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aRest', new BufferAttribute(rest, 3));
    g.setAttribute('aSkin', new BufferAttribute(skinUv, 2));
    g.setAttribute('aPair', new BufferAttribute(pair, 1));
    g.setAttribute('aBone', new BufferAttribute(bone, 4));
    g.setAttribute('aGirth', new BufferAttribute(girth, 1));
    g.setIndex(index);
    const arms = new Mesh(g, this.skin(3, { ARM: '' }, FrontSide));
    arms.frustumCulled = false;
    const line = new Mesh(g, this.contour({ ARM: '' }, { value: 1 }));
    line.frustumCulled = false;
    arms.add(line);
    this.scene.add(arms);
  }

  private buildCups() {
    const ball = new SphereGeometry(0.9, 10, 8);
    const g = new InstancedBufferGeometry();
    g.setIndex(ball.index);
    g.setAttribute('position', ball.getAttribute('position'));
    const count = ARMS.length * CUPS_PER_ARM * 2;
    const at = new Float32Array(count * 4);
    const girth = new Float32Array(count);
    let n = 0;
    ARMS.forEach((plan, i) => {
      for (let k = 0; k < CUPS_PER_ARM; k += 1) {
        const u = 0.06 + 0.86 * (k / CUPS_PER_ARM) ** 0.92;
        const f = u * (JOINTS - 1);
        // Two rows on the inner side
        for (const row of [-1, 1]) {
          at.set([i, f, Math.min(JOINTS - 1.001, f + (row > 0 ? 0.36 : 0)), Math.PI + row * 0.48], n * 4);
          girth[n] = armRadius(plan, u);
          n += 1;
        }
      }
    });
    g.setAttribute('aCup', new InstancedBufferAttribute(at, 4));
    g.setAttribute('aGirth', new InstancedBufferAttribute(girth, 1));
    g.instanceCount = count;
    const cups = new Mesh(g, new ShaderMaterial({ vertexShader: CUP_VERT, fragmentShader: CUP_FRAG, uniforms: this.shared, defines: { LAST: `${JOINTS - 2}.` } }));
    cups.frustumCulled = false;
    this.scene.add(cups);
  }

  private buildPlumes() {
    const quad = new PlaneGeometry(2, 2);
    quad.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(PLUMES * 4), 4));
    quad.setAttribute('aColor', new InstancedBufferAttribute(new Float32Array(PLUMES * 3), 3));
    quad.setAttribute('aCore', new InstancedBufferAttribute(new Float32Array(PLUMES * 3), 3));
    quad.setAttribute('aLife', new InstancedBufferAttribute(new Float32Array(PLUMES * 2), 2));
    const blend = { transparent: true, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor } as const;
    this.plumeMesh = new InstancedMesh(quad, new ShaderMaterial({ vertexShader: PLUME_VERT, fragmentShader: PLUME_FRAG, uniforms: this.shared, depthWrite: false, depthTest: true, ...blend }), PLUMES);
    this.plumeMesh.frustumCulled = false;
    this.plumeMesh.renderOrder = 2;
    this.plumeMesh.count = 0;
    this.scene.add(this.plumeMesh);
  }

  stage(w: number, h: number) {
    this.stageW = w;
    this.stageH = h;
  }

  place(x: number, y: number, z = 0) {
    this.x = this.tx = x;
    this.y = this.ty = y;
    this.z = this.tz = z;
    this.vx = this.vy = this.vz = 0;
    this.att = { yaw: this.yaw, pitch: this.pitch, roll: this.roll + this.lean, vy: 0, vp: 0, vr: 0 };
    this.ready = false;
  }

  arm(pair: number, side: -1 | 1): Arm {
    return this.arms.find((a) => a.plan.pair === pair && a.plan.side === side)!;
  }

  get unit() {
    return UNIT * this.scale;
  }

  // ── gestures ────────────────────────────────────────────────────────────

  reachTo(pair: number, side: -1 | 1, x: number, y: number, z = 0, bend: number = side) {
    const a = this.arm(pair, side);
    a.target.set(x - this.stageW / 2, this.stageH / 2 - y, z);
    a.bend = bend;
    a.reachGoal = 1;
  }

  release(pair?: number, side?: -1 | 1) {
    for (const a of this.arms) {
      if ((pair === undefined || a.plan.pair === pair) && (side === undefined || a.plan.side === side)) {
        a.reachGoal = 0;
        a.liftGoal = 0;
        a.curlGoal = 0;
        a.wagGoal = 0;
      }
    }
  }

  wave(side: -1 | 1 = 1, on = true) {
    const a = this.arm(1, side);
    a.liftGoal = on ? 1.5 : 0;
    a.curlGoal = on ? -0.4 : 0;
    a.wagGoal = on ? 1 : 0;
  }

  /** Open every arm for a moment. */
  bow(on: boolean) {
    for (const a of this.arms) a.liftGoal = on ? 0.42 : 0;
  }

  jet(dx: number, dy: number, power = 1) {
    this.squeezeV -= 4.6 * power;
    this.vx += dx * 560 * this.scale * power;
    this.vy += dy * 560 * this.scale * power;
  }

  puff(count = 14, power = 1) {
    this.armsRoot(v1);
    const [x, y, z] = v1.toArray();
    v2.set(0, -1, 0).applyQuaternion(this.quat);
    for (let i = 0; i < count && this.plumes.length < PLUMES; i += 1) {
      const k = i % 5;
      const s = (70 + Math.random() * 210) * this.scale * power;
      this.plumes.push({
        x, y, z,
        vx: (v2.x + (Math.random() - 0.5) * 1.3) * s,
        vy: (v2.y + (Math.random() - 0.5) * 1.3) * s,
        vz: (v2.z + (Math.random() - 0.5) * 0.9) * s,
        size: (24 + Math.random() * 40) * this.scale,
        age: -Math.random() * 0.12,
        life: 2.6 + Math.random() * 1.8,
        color: color(HEX[ARM_INKS[k]]),
        core: color(i % 3 === 0 ? HEX.bone : HEX[ARM_INKS[(k + 2) % 5]]),
        seed: [Math.random(), Math.random(), Math.random(), Math.random()],
      });
    }
  }

  startle(fromX: number, fromY: number) {
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.mood = 'surprised';
    this.jet(Math.cos(a), Math.sin(a) - 0.35, 1);
    this.puff(16);
  }

  hit(x: number, y: number): boolean {
    const c = Math.cos(-this.att.roll);
    const s = Math.sin(-this.att.roll);
    const dx = (x - this.x) / this.unit;
    const dy = -(y - this.y) / this.unit;
    const px = dx * c - dy * s;
    const py = dx * s + dy * c;
    return Math.abs(px) < 0.75 && py > -0.9 && py < 2.8;
  }

  // ── simulation ──────────────────────────────────────────────────────────

  private world(v: Vector3, x: number, y: number, z: number): Vector3 {
    return v
      .set(x, y, z)
      .multiplyScalar(this.unit)
      .applyQuaternion(this.quat)
      .add(v3.set(this.x - this.stageW / 2, this.stageH / 2 - this.y, this.z));
  }

  private armsRoot(v: Vector3) {
    return this.world(v, 0, -0.55, 0);
  }

  private gx = new Float32Array(JOINTS);
  private gy = new Float32Array(JOINTS);
  private gz = new Float32Array(JOINTS);

  private armGoal(a: Arm) {
    const { plan } = a;
    const S = this.unit;
    const t = this.t;
    const speed = Math.hypot(this.vx, this.vy);
    const trail = clamp(speed / (430 * this.scale));
    const er = v1.set(Math.sin(plan.phi), 0, Math.cos(plan.phi));
    const erx = er.x;
    const erz = er.z;
    const etx = Math.cos(plan.phi);
    const etz = -Math.sin(plan.phi);
    const root = this.world(v2, erx * plan.ring, -0.43, erz * plan.ring);
    const x0 = root.x;
    const y0 = root.y;
    const z0 = root.z;
    const L = plan.length * S;
    const step = L / (JOINTS - 1);
    const open = plan.splay * (1 - trail * 0.85) * (1 + this.voice * 0.16) + a.lift - Math.max(0, -this.squeeze) * 2;
    const curl = plan.curl * (1 - trail) + a.curl * 2.4 + 0.22 * Math.sin(t * 0.43 + a.seed * 2);

    let chord: Vector3 | null = null;
    let half = 0;
    let used = L;
    let bx = 0;
    let by = 0;
    let bz = 0;
    if (a.reach > 0.001) {
      chord = new Vector3().subVectors(a.target, root);
      const d = Math.max(10, chord.length());
      chord.divideScalar(d);
      used = Math.min(L, Math.max(d * 1.04, L * 0.45));
      const ratio = Math.min(0.999, d / used);
      let h = Math.sqrt(Math.max(0, 6 * (1 - ratio)));
      for (let i = 0; i < 4; i += 1) {
        const f = Math.sin(h) / h - ratio;
        const g = (Math.cos(h) * h - Math.sin(h)) / (h * h);
        h = Math.min(2.6, Math.max(0.02, h - f / (g || -1)));
      }
      half = h;
      // The arc bulges to one side of the chord, mostly in the plane of the screen.
      const n = v1.set(-chord.y * a.bend, chord.x * a.bend, 0.35);
      n.addScaledVector(chord, -n.dot(chord)).normalize();
      bx = n.x;
      by = n.y;
      bz = n.z;
    }

    let x = x0;
    let y = y0;
    let z = z0;
    let rx = x0;
    let ry = y0;
    let rz = z0;
    const rstep = used / (JOINTS - 1);
    this.gx[0] = x0;
    this.gy[0] = y0;
    this.gz[0] = z0;
    for (let j = 1; j < JOINTS; j += 1) {
      const u = (j - 0.5) / (JOINTS - 1);
      const calm = 1 - trail * 0.7;
      const alpha =
        open * (0.35 + 0.65 * Math.min(1, u * 3.2)) -
        open * 0.55 * smooth(u) +
        curl * u ** 2.1 * 1.6 +
        (0.1 + 0.26 * u) * Math.sin(u * 4.6 - t * 1.25 + a.seed) * calm +
        this.voice * 0.16 * u * Math.sin(u * 6 - t * 8.5 + a.seed);
      const beta =
        (0.08 + 0.34 * u) * Math.sin(u * 3.8 - t * 0.92 + a.seed * 2.3) * calm +
        plan.side * 0.5 * smooth(u) * (plan.pair % 2 ? 0.6 : -0.45) * calm +
        a.wag * Math.sin(t * 7) * 0.5 * smooth(u);
      const ca = Math.cos(alpha);
      const sa = Math.sin(alpha);
      const cb = Math.cos(beta);
      const sb = Math.sin(beta);
      const d = v1.set(cb * sa * erx + sb * etx, -cb * ca, cb * sa * erz + sb * etz).applyQuaternion(this.quat);
      x += d.x * step;
      y += d.y * step;
      z += d.z * step;
      let px = x;
      let py = y;
      let pz = z;
      if (chord) {
        const ang = half * (1 - 2 * u);
        const ch = Math.cos(ang);
        const sh = Math.sin(ang);
        rx += (chord.x * ch + bx * sh) * rstep;
        ry += (chord.y * ch + by * sh) * rstep;
        rz += (chord.z * ch + bz * sh) * rstep;
        px = lerp(x, rx, a.reach);
        py = lerp(y, ry, a.reach);
        pz = lerp(z, rz, a.reach);
      }
      this.gx[j] = px;
      this.gy[j] = py;
      this.gz[j] = pz;
    }
  }

  update(dtRaw: number, t: number) {
    if (!this.awake) return;
    const dt = Math.min(0.033, Math.max(0.001, dtRaw));
    this.t = t;
    const sc = this.scale;

    const k = 5.2 * this.urge;
    this.vx += ((this.tx - this.x) * k - this.vx * 3.1) * dt;
    this.vy += ((this.ty - this.y) * k - this.vy * 3.1) * dt;
    this.vz += ((this.tz - this.z) * k - this.vz * 3.1) * dt;
    const cap = 1500 * sc * this.urge;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > cap) {
      this.vx *= cap / speed;
      this.vy *= cap / speed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;

    // The eye follows what it looks at; the body hardly turns, so it keeps its best side.
    const lx = clamp((this.lookX - this.x) / (900 * sc), -1, 1);
    const ly = clamp((this.lookY - this.y) / (700 * sc), -1, 1);
    const goalYaw = this.yaw + lx * 0.05 + Math.sin(t * 0.37) * 0.025;
    const goalPitch = this.pitch + ly * 0.04 + Math.sin(t * 0.51 + 1) * 0.02 + clamp(-this.vy / (900 * sc), -0.35, 0.35) * 0.4;
    const goalRoll = this.roll + this.lean - clamp(this.vx / (760 * sc), -0.75, 0.75) + Math.sin(t * 0.43 + 2) * 0.035;
    const A = this.att;
    const spin = (now: number, v: number, goal: number, s: number, d: number) => v + (s * (goal - now) - d * v) * dt;
    A.vy = spin(A.yaw, A.vy, goalYaw, 9, 5);
    A.vp = spin(A.pitch, A.vp, goalPitch, 9, 5);
    A.vr = spin(A.roll, A.vr, goalRoll, 14, 6);
    A.yaw += A.vy * dt;
    A.pitch += A.vp * dt;
    A.roll += A.vr * dt;
    this.quat.setFromAxisAngle(Z, A.roll);
    q1.setFromEuler(e1.set(A.pitch, 0, 0));
    q2.setFromEuler(e1.set(0, A.yaw, 0));
    this.quat.multiply(q1).multiply(q2);

    // Breathing, and the beat of its voice
    const breathe = Math.sin(t * 1.5) * 0.028;
    this.squeezeV += (60 * (breathe + this.voice * 0.05 * Math.sin(t * 15) - this.squeeze) - 8 * this.squeezeV) * dt;
    this.squeeze += this.squeezeV * dt;
    // The tip of the mantle lags behind the head.
    v1.set(-this.vx, this.vy, -this.vz).multiplyScalar(1 / (760 * sc)).applyQuaternion(q1.copy(this.quat).invert());
    const gx = clamp(v1.x - A.vr * 0.04, -0.7, 0.7) + Math.sin(t * 0.8) * 0.05;
    const gz = clamp(v1.z, -0.7, 0.7) + Math.cos(t * 0.66) * 0.05;
    this.bendV.x += (30 * (gx - this.bend.x) - 6 * this.bendV.x) * dt;
    this.bendV.y += (30 * (gz - this.bend.y) - 6 * this.bendV.y) * dt;
    this.bend.x += this.bendV.x * dt;
    this.bend.y += this.bendV.y * dt;

    // Eyes
    const ease = 1 - Math.exp(-dt * 7);
    this.gazeNow.x += (this.lookX - this.gazeNow.x) * ease;
    this.gazeNow.y += (this.lookY - this.gazeNow.y) * ease;
    q1.copy(this.quat).invert();
    [1, -1].forEach((side, i) => {
      const eye = this.world(v2, side * EYE_AT.x, EYE_AT.y, EYE_AT.z);
      v1.set(this.gazeNow.x - this.stageW / 2 - eye.x, this.stageH / 2 - this.gazeNow.y - eye.y, 620 * sc).normalize().applyQuaternion(q1);
      const out = v3.set(side, -0.04, 0.16).normalize();
      // The eye only turns so far in its socket.
      const c = v1.dot(out);
      const limit = Math.cos(0.62);
      if (c < limit) {
        v1.addScaledVector(out, -c).normalize().multiplyScalar(Math.sqrt(1 - limit * limit)).addScaledVector(out, limit);
      }
      this.gaze[i].lerp(v1, ease).normalize();
      (this.eyes[i].material as ShaderMaterial).uniforms.uPupil.value = this.pupil;
    });
    const pupils: Record<Mood, number> = { calm: 0.5, curious: 0.64, surprised: 0.78, shy: 0.4, glad: 0.58 };
    this.pupil += (pupils[this.mood] + this.voice * 0.05 - this.pupil) * (1 - Math.exp(-dt * 5));

    for (let i = 0; i < 5; i += 1) this.litNow[i] += (this.lit[i] - this.litNow[i]) * (1 - Math.exp(-dt * 6));
    this.blushNow += (this.blush - this.blushNow) * (1 - Math.exp(-dt * 3));

    // On a stressed syllable one arm opens.
    this.talkIn -= dt;
    if (this.voice > 0.34 && this.voice > this.lastVoice + 0.02 && this.talkIn <= 0) {
      const pair = [0, 2, 4, 1][this.talk % 4];
      const side = this.talk % 2 ? 1 : -1;
      this.talk += 1;
      this.talkIn = 0.34;
      const a = this.arm(pair, side as -1 | 1);
      if (a.reachGoal === 0 && a.wagGoal === 0 && a.liftGoal === 0) {
        a.liftGoal = 0.35 + this.voice * 0.5;
        window.setTimeout(() => {
          if (a.wagGoal === 0) a.liftGoal = 0;
        }, 460);
      }
    }
    this.lastVoice = this.voice;

    for (const a of this.arms) {
      const f = 1 - Math.exp(-dt * 6);
      a.lift += (a.liftGoal - a.lift) * f;
      a.curl += (a.curlGoal - a.curl) * f;
      a.wag += (a.wagGoal - a.wag) * f;
      a.reach += (a.reachGoal - a.reach) * (1 - Math.exp(-dt * 6));
      this.armGoal(a);
      if (!this.ready) {
        a.x.set(this.gx);
        a.y.set(this.gy);
        a.z.set(this.gz);
        a.vx.fill(0);
        a.vy.fill(0);
        a.vz.fill(0);
        continue;
      }
      a.x[0] = this.gx[0];
      a.y[0] = this.gy[0];
      a.z[0] = this.gz[0];
      for (let j = 1; j < JOINTS; j += 1) {
        const u = j / (JOINTS - 1);
        const stiff = lerp(260, 34 + a.reach * 70, u ** 0.7);
        const damp = 2 * Math.sqrt(stiff) * 0.62;
        a.vx[j] += (stiff * (this.gx[j] - a.x[j]) - damp * a.vx[j]) * dt;
        a.vy[j] += (stiff * (this.gy[j] - a.y[j]) - damp * a.vy[j]) * dt;
        a.vz[j] += (stiff * (this.gz[j] - a.z[j]) - damp * a.vz[j]) * dt;
        a.x[j] += a.vx[j] * dt;
        a.y[j] += a.vy[j] * dt;
        a.z[j] += a.vz[j] * dt;
      }
    }
    this.ready = true;

    for (const p of this.plumes) {
      p.age += dt;
      if (p.age < 0) continue;
      const drag = Math.exp(-dt * 1.9);
      p.vx *= drag;
      p.vy *= drag;
      p.vz *= drag;
      p.x += p.vx * dt + Math.sin(p.age * 1.3 + p.seed[2] * 9) * 5 * dt;
      p.y += p.vy * dt + 6 * dt;
      p.z += p.vz * dt;
    }
    this.plumes = this.plumes.filter((p) => p.age < p.life);
  }

  // ── drawing ─────────────────────────────────────────────────────────────

  private tangents = new Float32Array(JOINTS * 3);

  /** Sends the joints of every arm, and the two directions across each, to the graphics card. */
  private poseArms() {
    const B = this.bones.image.data as Float32Array;
    this.arms.forEach((a, i) => {
      const { plan } = a;
      const T = this.tangents;
      for (let j = 0; j < JOINTS; j += 1) {
        const p = Math.max(0, j - 1);
        const q = Math.min(JOINTS - 1, j + 1);
        const dx = a.x[q] - a.x[p];
        const dy = a.y[q] - a.y[p];
        const dz = a.z[q] - a.z[p];
        const d = Math.hypot(dx, dy, dz) || 1;
        T[j * 3] = dx / d;
        T[j * 3 + 1] = dy / d;
        T[j * 3 + 2] = dz / d;
      }
      // The outer side of the arm, carried along without twisting
      v1.set(Math.sin(plan.phi), 0.3, Math.cos(plan.phi)).applyQuaternion(this.quat);
      let nx = v1.x;
      let ny = v1.y;
      let nz = v1.z;
      const row = i * 3 * JOINTS * 4;
      for (let j = 0; j < JOINTS; j += 1) {
        const tx = T[j * 3];
        const ty = T[j * 3 + 1];
        const tz = T[j * 3 + 2];
        const dot = nx * tx + ny * ty + nz * tz;
        nx -= tx * dot;
        ny -= ty * dot;
        nz -= tz * dot;
        const d = Math.hypot(nx, ny, nz) || 1;
        nx /= d;
        ny /= d;
        nz /= d;
        const o = row + j * 4;
        const n = o + JOINTS * 4;
        const b = n + JOINTS * 4;
        B[o] = a.x[j];
        B[o + 1] = a.y[j];
        B[o + 2] = a.z[j];
        B[n] = nx;
        B[n + 1] = ny;
        B[n + 2] = nz;
        B[b] = ty * nz - tz * ny;
        B[b + 1] = tz * nx - tx * nz;
        B[b + 2] = tx * ny - ty * nx;
      }
    });
    this.bones.needsUpdate = true;
  }

  private skinPlumes() {
    const g = this.plumeMesh.geometry;
    const seed = g.getAttribute('aSeed') as InstancedBufferAttribute;
    const tone = g.getAttribute('aColor') as InstancedBufferAttribute;
    const life = g.getAttribute('aLife') as InstancedBufferAttribute;
    const core = g.getAttribute('aCore') as InstancedBufferAttribute;
    const alive = this.plumes.filter((p) => p.age > 0).sort((a, b) => a.z - b.z);
    alive.forEach((p, i) => {
      const u = p.age / p.life;
      const size = p.size * (0.35 + 1.5 * (1 - (1 - u) ** 2.4));
      m1.makeScale(size, size, size).setPosition(p.x, p.y, p.z);
      this.plumeMesh.setMatrixAt(i, m1);
      seed.setXYZW(i, ...p.seed);
      tone.setXYZ(i, p.color.r, p.color.g, p.color.b);
      core.setXYZ(i, p.core.r, p.core.g, p.core.b);
      life.setXY(i, p.age, Math.min(1, p.age * 5) * (1 - smooth(clamp((u - 0.4) / 0.6))) * 0.92);
    });
    this.plumeMesh.count = alive.length;
    this.plumeMesh.instanceMatrix.needsUpdate = true;
    seed.needsUpdate = tone.needsUpdate = core.needsUpdate = life.needsUpdate = true;
  }

  /** Draw the part of the stage the canvas covers. Sizes in CSS pixels. */
  render(left: number, top: number, w: number, h: number, ratio: number) {
    const { renderer } = this;
    if (this.disposed || !this.awake || !renderer) return;
    const pw = Math.max(1, Math.round(w * ratio));
    const ph = Math.max(1, Math.round(h * ratio));
    if (this.canvas.width !== pw || this.canvas.height !== ph) renderer.setSize(pw, ph, false);
    const D = this.stageH / 2 / Math.tan((FOV * Math.PI) / 360);
    this.camera.aspect = this.stageW / this.stageH;
    this.camera.position.set(0, 0, D);
    this.camera.near = D * 0.15;
    this.camera.far = D * 3;
    this.camera.setViewOffset(this.stageW, this.stageH, left, top, w, h);
    this.camera.updateProjectionMatrix();

    this.body.position.set(this.x - this.stageW / 2, this.stageH / 2 - this.y, this.z);
    this.body.quaternion.copy(this.quat);
    this.body.scale.setScalar(this.unit);
    this.poseArms();
    this.skinPlumes();
    this.shared.uTime.value = this.t;
    this.shared.uVoice.value = this.voice;
    this.shared.uLine.value = this.line * Math.sqrt(this.scale);
    this.unitUniform.value = this.unit;
    this.scaleUniform.value = this.unit;
    this.shared.uBlush.value = this.blushNow;
    this.shared.uSqueeze.value = this.squeeze;
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (o.material as ShaderMaterial).dispose();
      }
    });
    this.paint?.dispose();
    this.bones.dispose();
    const { renderer, canvas } = this;
    renderer?.dispose();
    window.setTimeout(() => {
      if (!canvas.isConnected) renderer?.forceContextLoss();
    }, 0);
  }
}
