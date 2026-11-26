/**
 * Mathematical marbling (after Lu, Jaffer et al., "Mathematical Marbling", IEEE CG&A 2012).
 *
 * Nothing is simulated or stored. Every pixel is traced backwards through the strokes and
 * ink drops that moved it until it lands in the drop that coloured it, so the edges stay
 * sharp at any size. The screen-space derivative of that path travels along with the point,
 * which gives exact coverage for antialiasing and lets veins keep an even pixel width.
 */
export const MAX_DROPS = 96;
export const MAX_STROKES = 14;
export const FIELD_SIZE = 1024;

/** The slow current that bends everything, baked once: smooth noise over [-4, 4)², two octaves. */
export const FIELD = `#version 300 es
precision highp float;
out vec4 o;
uniform float uStep;         // ink units per texel
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*f*(f*(f*6. - 15.) + 10.);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main(){
  vec2 q = gl_FragCoord.xy * uStep - 4.;
  vec2 n = vec2(noise(q), noise(q + vec2(37.2, 11.8))) - .5;
  vec2 m = vec2(noise(q * 2.1 + n * 2. + 4.1), noise(q * 2.1 - n * 2. + 9.7)) - .5;
  o = vec4(n + m * .42, 0., 1.);
}`;

export const VERT = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0., 1.); }`;

/** Uniforms and functions shared by every program that shows ink. */
export const INK = `
precision highp float;
precision highp sampler2D;
uniform sampler2D uNoise;    // baked current, see FIELD
uniform float uTime;
uniform int uN;
uniform vec4 uD[${MAX_DROPS}];       // centre, r² of the whole spot, tag: see InkUpload
uniform vec4 uOwn[${MAX_DROPS / 4}];     // r² of each drop alone
uniform vec3 uPal[8];
uniform vec4 uComb, uComb2;  // amplitude, spacing, angle, phase
uniform vec4 uVort[4];       // centre, radius, angle
uniform vec4 uStroke[${MAX_STROKES}]; // centre, displacement
uniform int uStrokes;
uniform float uStrokeK;
uniform vec4 uPetal;         // count, depth, width, phase
uniform vec4 uPetalAt;       // centre, inner and outer falloff
uniform vec4 uRipple;        // centre, amplitude, wavenumber
uniform vec2 uRippleMod;     // phase, reach
uniform vec4 uWarp;          // amplitude, frequency, offset
uniform vec3 uVein;          // relative width, min px, max px
uniform vec3 uTone;          // vein opacity, pooling, grain
uniform float uWater;        // opacity of bare water

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Beyond its edge the current goes on as in a mirror, so ink can drift for as long as it likes.
ivec2 fold(ivec2 i){ i &= ${FIELD_SIZE * 2 - 1}; return min(i, ${FIELD_SIZE * 2 - 1} - i); }
// Hardware filtering only keeps 8 bits of position, which shows once the ink is stretched.
vec2 current(vec2 q){
  vec2 t = (q + 4.) * 128. - .5, i = floor(t), f = t - i;
  ivec2 a = fold(ivec2(i)), b = fold(ivec2(i) + 1);
  return mix(
    mix(texelFetch(uNoise, a, 0).xy, texelFetch(uNoise, ivec2(b.x, a.y), 0).xy, f.x),
    mix(texelFetch(uNoise, ivec2(a.x, b.y), 0).xy, texelFetch(uNoise, b, 0).xy, f.x), f.y);
}
float cusp(float x){ float f = abs(fract(x) - .5) * 2.; return exp(-3.2 * (1. - f)) * 1.04 - exp(-3.2 * f) * 1.04; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Strokes were made after the drops fell, so they are undone first.
vec2 unstroke(vec2 p){
  for (int i = 0; i < uStrokes; i++) {
    vec4 s = uStroke[i];
    vec2 q = p - s.xy;
    p -= s.zw * exp(-dot(q, q) * uStrokeK);
  }
  for (int i = 0; i < 4; i++) {
    vec4 w = uVort[i];
    if (w.w == 0.) continue;
    vec2 q = p - w.xy;
    float d = length(q);
    p = w.xy + rot(w.w * exp(-d*d / (w.z*w.z))) * q;
  }
  if (uWarp.x > 0.) p += uWarp.x * current(p * uWarp.y + uWarp.zw);
  if (uRipple.z != 0.) {
    vec2 q = p - uRipple.xy;
    float rho = length(q);
    float wave = sin(rho * uRipple.w - uRippleMod.x) * exp(-rho / uRippleMod.y) * smoothstep(0., .05, rho);
    p += q / max(rho, 1e-4) * uRipple.z * wave;
  }
  if (uPetal.y != 0.) {
    vec2 q = p - uPetalAt.xy;
    float rho = length(q), k = 6.2831853 / uPetal.x;
    float a = (fract((atan(q.y, q.x) + uPetal.w) / k + .5) - .5) * k;
    float pull = uPetal.y * exp(-rho * abs(sin(a)) / uPetal.z) * smoothstep(max(0., uPetalAt.z), uPetalAt.w, rho);
    // A negative inner radius keeps the strokes from reaching further than that.
    if (uPetalAt.z < 0.) pull *= smoothstep(-uPetalAt.z * 1.35, -uPetalAt.z, rho);
    p = uPetalAt.xy + q * ((rho + pull) / max(rho, 1e-4));
  }
  if (uComb2.x != 0.) { vec2 q = rot(uComb2.z) * p; q.x -= uComb2.x * cusp(q.y / uComb2.y + uComb2.w); p = rot(-uComb2.z) * q; }
  if (uComb.x != 0.) { vec2 q = rot(uComb.z) * p; q.y -= uComb.x * cusp(q.x / uComb.y + uComb.w); p = rot(-uComb.z) * q; }
  return p;
}

// Colour (premultiplied) of the ink at a point of the finished picture.
vec4 ink(vec2 at){
  vec2 p = unstroke(at);
  vec2 dx = dFdx(p), dy = dFdy(p);
  vec3 acc = vec3(0.);
  float cover = 0., near = 1e3;
  for (int i = uN - 1; i >= 0; i--) {
    vec4 d = uD[i];
    vec2 q = p - d.xy;
    float i2 = 1. / max(dot(q, q), 1e-9), m = d.z * i2;
    int tag = int(d.w);
    // Drops on one spot push as one drop when seen from outside.
    if (m < .06) { p = d.xy + q * (1. - m * (.5 + m * .125)); i -= tag >> 3; continue; }
    vec2 g = vec2(dot(q, dx), dot(q, dy));
    if (m < .28) i -= tag >> 3;
    else { if (tag > 7) d.z = uOwn[i >> 2][i & 3]; m = d.z * i2; }
    if (m > .5) {
      d.z = sqrt(d.z);
      float dist = 1. / sqrt(i2), gl = length(g) + 1e-9;
      near = min(near, abs(dist - d.z) / max(.02, d.z));
      float s = (1. / i2 - d.z * d.z) / (2. * gl);   // signed distance to the rim, in pixels
      if (s < 4.) {
        float w = clamp(uVein.x * d.z * dist / gl, uVein.y, uVein.z);
        float line = (1. - smoothstep(w - .8, w + .8, abs(s))) * uTone.x * (1. - cover);
        acc += uPal[7] * line; cover += line;
        float fill = clamp(.5 - s, 0., 1.) * (1. - cover);
        acc += uPal[tag & 7] * mix(1. - uTone.y, 1., smoothstep(0., .30, near)) * fill; cover += fill;
        if (cover > .995) break;
      }
    }
    float k = sqrt(max(6e-4, 1. - m));
    vec2 b = q * (m * i2 / k);
    dx = k * dx + b * g.x;
    dy = k * dy + b * g.y;
    p = d.xy + q * k;
  }
  float water = (1. - cover) * uWater;
  acc += uPal[0] * water;
  float alpha = cover + water;
  acc += (hash(gl_FragCoord.xy + fract(uTime) * 17.) - .5) * uTone.z * alpha;
  return vec4(acc, alpha);
}`;

/** Ink filling a rectangle. */
export const FRAG = `#version 300 es
${INK}
out vec4 o;
uniform vec4 uRect;          // view origin and size in device pixels
uniform vec3 uView;          // shift, scale
void main(){ o = ink((gl_FragCoord.xy - uRect.xy - .5 * uRect.zw) / uRect.w * uView.z + uView.xy); }`;
