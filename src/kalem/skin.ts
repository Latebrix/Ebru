/**
 * Kalem is an illustration that happens to move: flat colour, one clean shadow, one highlight and
 * a drawn contour, with marbled paper for the mantle. Nothing here tries to look real.
 */
const COMMON = `
precision highp float;
uniform float uTime, uVoice;
uniform vec3 uBone, uDark;

float hash1(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
vec3 hash3(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(mix(hash1(i), hash1(i + vec3(1,0,0)), f.x), mix(hash1(i + vec3(0,1,0)), hash1(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash1(i + vec3(0,0,1)), hash1(i + vec3(1,0,1)), f.x), mix(hash1(i + vec3(0,1,1)), hash1(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float step1(float e, float v){ float w = fwidth(v) * .8; return smoothstep(e - w, e + w, v); }`;

/** Three rows of this texture for every arm: its joints, and the two directions across each of them. */
const BONES = `
uniform highp sampler2D uBones;
uniform float uScale;`;

/** Shared by the fills and, pushed outward along the normal, by the contour. */
export const SKIN_VERT = `
attribute vec3 aRest;
attribute vec2 aSkin;
attribute float aPair;
#ifdef ARM
attribute vec4 aBone;        // arm, joint, and the place on its ring
attribute float aGirth;
${BONES}
#else
attribute vec2 aFin;
#endif
uniform vec2 uBend;
uniform float uSqueeze, uTime, uVoice, uLine, uUnit;
varying vec3 vN, vV, vRest;
varying vec2 vSkin;
varying float vPair, vEdge, vAlong;
void main(){
#ifdef ARM
  ivec2 at = ivec2(int(aBone.y + .5), int(aBone.x + .5) * 3);
  vec3 n = texelFetch(uBones, at + ivec2(0, 1), 0).xyz * aBone.z + texelFetch(uBones, at + ivec2(0, 2), 0).xyz * aBone.w;
  vec3 p = texelFetch(uBones, at, 0).xyz + n * aGirth * uScale;
#else
  vec3 p = position, n = normal;
#endif
#ifdef BODY
  float up = max(0., p.y);
  p.xz *= 1. + uSqueeze * sin(clamp(p.y / 2.7, 0., 1.) * 3.14159);
#ifdef FIN
  // The wave that keeps it hovering runs along each fin.
  float s = aFin.x * 7.4 - uTime * 3.2;
  float grow = pow(aFin.y, 1.35) * (.15 + .05 * uVoice) * smoothstep(0., .16, aFin.x) * smoothstep(1., .9, aFin.x);
  p.z += sin(s) * grow;
  vec3 tilt = vec3(-sin(s) * 1.35 * pow(aFin.y, .35) * .2 * sign(p.x), -cos(s) * 7.4 * grow * .62, 1.);
  n = normalize(tilt) * sign(n.z);
#endif
  p.xz += uBend * up * up * .15;
  n = normalize(n - vec3(0., dot(n.xz, uBend) * up * .3, 0.));
#endif
#ifdef LINE
  p += normalize(n) * uLine / uUnit;
#endif
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vV = -mv.xyz;
  vN = normalMatrix * n;
  vRest = aRest;
  vSkin = aSkin;
  vPair = aPair;
#ifdef ARM
  vEdge = vAlong = 0.;
#else
  vEdge = aFin.y;
  vAlong = aFin.x;
#endif
  gl_Position = projectionMatrix * mv;
}`;

export const LINE_FRAG = `
precision highp float;
uniform vec3 uBone;
void main(){ gl_FragColor = vec4(uBone, 1.); }`;

export const SKIN_FRAG = `${COMMON}
uniform sampler2D uPaint;
uniform vec3 uInk[5], uDeep[5], uPale[5];
uniform float uLit[5];
uniform float uBlush;
varying vec3 vN, vV, vRest;
varying vec2 vSkin;
varying float vPair, vEdge, vAlong;

// Spots that open and close like the pigment cells of a real squid, drawn as flat discs.
float spots(vec3 at, float scale, float open, float seed){
  vec3 q = at * scale + seed, id = floor(q), f = fract(q) - .5;
  vec3 s = vec3(f.x < 0. ? -1. : 1., f.y < 0. ? -1. : 1., f.z < 0. ? -1. : 1.);
  float best = 9., pick = 0.;
  for (int i = 0; i < 8; i++) {
    vec3 o = vec3(float(i & 1), float((i >> 1) & 1), float((i >> 2) & 1)) * s;
    vec3 h = hash3(id + o);
    vec3 d = f - o - (h - .5) * .36;
    float l = dot(d, d);
    if (l < best) { best = l; pick = h.z; }
  }
  float r = mix(.0, .44, clamp(open * (.4 + 1.1 * pick), 0., 1.));
  float l = sqrt(best), px = length(fwidth(at)) * scale * .7;
  return smoothstep(r + px, r - px, l) * step(.03, r);
}

void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float bands = sin(vRest.y * 4.4 + noise(vRest * 1.6) * 2. - uTime * 5.2) * .5 + .5;
  // One light from the upper left, one clean edge between light and shadow.
  float light = dot(N, normalize(vec3(-.56, .5, .66)));
  float lit = step1(.12, light);
  float sheen = step1(.952, dot(N, normalize(vec3(-.46, .48, .75))));
  vec3 base, shade;

#if PART == 3
  {
    // Arm: its teammate's ink, with a deeper band and a pale line, like pulled ink.
    int pair = int(floor(vPair + .5));
    base = uInk[pair];
    shade = uDeep[pair];
    float around = vSkin.y * 6.2832;
    float w = fwidth(around) * .8;
    base = mix(base, uPale[pair], smoothstep(.11 + w, .11 - w, abs(around - 2.25)));
    float open = uVoice * (.1 + .7 * bands * bands) + uLit[pair] * .75;
    float d = spots(vRest, 11., open, 2.);
    base = mix(base, uBone, d * .95);
    shade = mix(shade, uBone, d * .6);
    sheen = 0.;
  }
#elif PART == 0
  {
    // Mantle: marbled paper whose ink has not quite dried, and trembles while it speaks
    vec2 uv = vec2(vSkin.y, vSkin.x);
    vec2 q = uv - vec2(.5, .1);
    float rho = length(q);
    uv += .011 * vec2(sin(uv.y * 8. + uTime * .55) + .6 * sin(uv.y * 19. - uTime * .8), sin(uv.x * 9. - uTime * .47));
    uv += q / max(rho, 1e-3) * .02 * uVoice * sin(rho * 26. - uTime * 12.);
    base = texture2D(uPaint, uv).rgb;
    shade = base * vec3(.6, .56, .7);
  }
#elif PART == 1
  {
    // Head and funnel: bone, with the team's inks rising in it as spots
    base = uBone;
    shade = uBone * vec3(.8, .77, .76);
    vec3 h = hash3(floor(vRest * 9. + 4.));
    float d = spots(vRest, 9., max(0., uVoice * bands * .75 + uBlush * .9 - .12), 4.);
    vec3 c = mix(uInk[int(mod(floor(h.x * 5.), 5.))], uInk[3], uBlush * .7);
    base = mix(base, c, d);
    shade = mix(shade, c * .72, d);
    sheen = 0.;
  }
#else
  {
    // Fins: blue, ruled with fine rays
    base = uInk[0];
    shade = uDeep[0];
    float ray = abs(fract(vAlong * 15.) - .5) * 2.;
    float rw = fwidth(vAlong * 15.) * 1.5;
    float line = smoothstep(1. - rw * 1.4, 1. - rw * .2, ray) * smoothstep(.1, .16, vEdge);
    base = mix(base, uBone, line * .85);
    shade = mix(shade, uBone, line * .6);
    float hem = step1(.955, vEdge);
    base = mix(base, uBone, hem);
    shade = mix(shade, uBone, hem);
    sheen = 0.;
  }
#endif
  vec3 col = mix(shade, base, lit);
  col = mix(col, uBone, sheen * .92);
  gl_FragColor = vec4(col, 1.);
}`;

export const EYE_VERT = `
varying vec3 vN, vV, vP;
uniform float uLine, uUnit;
void main(){
  vec3 p = position;
#ifdef LINE
  p += normalize(normal) * uLine / uUnit;
#endif
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vV = -mv.xyz;
  vN = normalMatrix * normal;
  vP = position;
  gl_Position = projectionMatrix * mv;
}`;

export const EYE_FRAG = `${COMMON}
uniform vec3 uGaze, uSaff, uVerm;
uniform float uPupil;
varying vec3 vN, vV, vP;
void main(){
  vec3 N = normalize(vN), P = normalize(vP), g = normalize(uGaze);
  vec3 side = normalize(cross(vec3(0., 1., 0.), g)), up = cross(g, side);
  vec2 e = vec2(dot(P, side), dot(P, up));
  float a = acos(clamp(dot(P, g), -1., 1.));
  vec2 dir = normalize(e + 1e-6) * a;
  float w = fwidth(a) * .8;
  // Gold iris, a thin ring of vermilion, and the long horizontal pupil of a cephalopod.
  vec3 col = uDark;
  col = mix(uSaff, col, smoothstep(.96 - w, .96 + w, a));
  col = mix(col, uVerm, smoothstep(w, -w, abs(a - .8) - .045));
  vec2 q = vec2(dir.x, dir.y + .05 * cos(dir.x * 4.6));
  vec2 half_ = vec2(.5, .17 + .2 * uPupil);
  float r = half_.y;
  vec2 k = abs(q) - vec2(half_.x - r * .2, 0.);
  float slit = length(max(k, 0.)) + min(max(k.x, k.y), 0.) - r;
  col = mix(uDark, col, smoothstep(-w, w, slit));
  // One highlight, always from the same light
  vec2 h = N.xy - vec2(-.3, .34);
  float hl = length(h);
  float hw = fwidth(hl);
  col = mix(uBone, col, smoothstep(.13 - hw, .13 + hw, hl));
  gl_FragColor = vec4(col, 1.);
}`;

export const CUP_FRAG = `
precision highp float;
uniform vec3 uBone;
void main(){ gl_FragColor = vec4(uBone, 1.); }`;

/** Suckers sit on the inner side of the arms, wherever those are. */
export const CUP_VERT = `
attribute vec4 aCup;         // arm, joint it faces from, joint it sits at, angle around the arm
attribute float aGirth;
${BONES}
vec3 bone(float f, int row){
  float j = min(floor(f), LAST);
  ivec2 at = ivec2(int(j), int(aCup.x + .5) * 3 + row);
  return mix(texelFetch(uBones, at, 0).xyz, texelFetch(uBones, at + ivec2(1, 0), 0).xyz, f - j);
}
void main(){
  vec3 n = bone(aCup.y, 1), b = bone(aCup.y, 2);
  vec3 o = normalize(n * cos(aCup.w) + b * sin(aCup.w));
  vec3 t = normalize(cross(n, b)), s = cross(o, t);
  float r = aGirth * uScale, size = r * .21;
  vec3 p = bone(aCup.z, 0) + o * r * .9 + (t * position.x + s * position.y) * size + o * position.z * size * .8;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}`;

/** Clouds of ink, drawn as flat marbled rings with the same contour. */
export const PLUME_VERT = `
attribute vec4 aSeed;
attribute vec3 aColor, aCore;
attribute vec2 aLife;
varying vec2 vUv;
varying vec4 vSeed;
varying vec3 vColor, vCore;
varying vec2 vLife;
varying float vSize;
void main(){
  vUv = position.xy * 1.15;
  vSeed = aSeed;
  vColor = aColor;
  vCore = aCore;
  vLife = aLife;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(0., 0., 0., 1.);
  float size = length(instanceMatrix[0].xyz);
  vSize = size;
  mv.xy += position.xy * size * 1.15;
  gl_Position = projectionMatrix * mv;
}`;

export const PLUME_FRAG = `${COMMON}
uniform float uLine;
varying vec2 vUv;
varying vec4 vSeed;
varying vec3 vColor, vCore;
varying vec2 vLife;
varying float vSize;
void main(){
  float th = atan(vUv.y, vUv.x), r = length(vUv);
  // A drop that has just been pulled through water: a few soft lobes
  float k = 3. + floor(vSeed.x * 3.);
  float shape = 1. - .16 * (1. - cos(th * k + vSeed.y * 6.28 + vLife.x * .6)) - .05 * sin(th * 2. + vSeed.z * 6.28);
  float d = r / shape;
  float w = fwidth(d) * .8, line = uLine / vSize * 1.1;
  float a = smoothstep(1. + w, 1. - w, d) * vLife.y;
  vec3 col = vColor;
  col = mix(col, vCore, smoothstep(.62 + w, .62 - w, d));
  col = mix(col, uBone, smoothstep(line + w, line - w, abs(d - .62)));
  col = mix(col, vColor * .72, smoothstep(.3 + w, .3 - w, d));
  col = mix(col, uBone, smoothstep(1. - line * 2. - w, 1. - line * 2. + w, d));
  gl_FragColor = vec4(col * a, a);
}`;
