import type { RGB } from '../ink/Marble.ts';

/** The five inks, the paper and the water. Every colour in the product comes from here. */
export const HEX = {
  ink: '#08080d',
  blue: '#2a3df0',
  verm: '#ff5a3c',
  saff: '#ffb43a',
  pink: '#ff9ec2',
  teal: '#0f9d8f',
  bone: '#f4ece0',
} as const;

export type InkName = keyof typeof HEX;

export const C = { ink: 0, water: 0, blue: 1, verm: 2, saff: 3, pink: 4, teal: 5, bone: 6, vein: 7 } as const;

export function rgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as unknown as RGB;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Ink on dark water: index 0 water, 1–6 inks, 7 vein. */
export const ON_WATER: RGB[] = [HEX.ink, HEX.blue, HEX.verm, HEX.saff, HEX.pink, HEX.teal, HEX.bone, HEX.bone].map(rgb);

/** Ink printed on bone paper. */
export const ON_PAPER: RGB[] = [HEX.bone, HEX.blue, HEX.verm, HEX.saff, HEX.pink, HEX.teal, '#14141c', HEX.bone].map(rgb);

/** Where each ink goes when it is laid on thick: a deeper hue, never a muddy grey. */
const DEEP: Record<string, string> = {
  [HEX.blue]: '#111a8c',
  [HEX.verm]: '#a81d12',
  [HEX.saff]: '#d8720f',
  [HEX.pink]: '#d04b86',
  [HEX.teal]: '#065a52',
};

/** One ink in its own tints and shades, for a member's bar, jar or sleeve. */
export function tints(hex: string): RGB[] {
  const base = rgb(hex);
  const white: RGB = [1, 1, 1];
  const deep = rgb(DEEP[hex] ?? '#08080d');
  return [base, mix(base, white, 0.26), mix(base, deep, 0.5), base, mix(base, white, 0.5), deep, base, mix(base, white, 0.8)];
}

/** Which ink each member of the sample team paints with. */
export const MEMBER_INK: Record<string, InkName> = {
  laila: 'blue',
  omar: 'verm',
  karim: 'saff',
  nour: 'pink',
  youssef: 'teal',
};

export function memberHex(id: string): string {
  return HEX[MEMBER_INK[id] ?? 'bone'];
}

/** Text colour that stays readable on a given ink. */
export function onInk(name: InkName): string {
  return name === 'blue' || name === 'teal' || name === 'ink' ? HEX.bone : HEX.ink;
}
