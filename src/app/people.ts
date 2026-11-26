import { HEX, MEMBER_INK, onInk, type InkName } from '../brand/palette.ts';
import { team } from '../data/atlas.ts';

/** Portraits are paper collages of nobody in particular. */
const CAMEO: Record<string, number> = { laila: 3, omar: 4, nour: 11, youssef: 1, karim: 12 };

export const people = team.members.map((m) => ({
  id: m.id,
  name: m.name,
  first: m.first,
  role: m.role,
  ink: MEMBER_INK[m.id] as InkName,
  hex: HEX[MEMBER_INK[m.id]],
  text: onInk(MEMBER_INK[m.id]),
  portrait: `./ebru/show/cameo-${CAMEO[m.id]}.webp`,
}));

export type Person = (typeof people)[number];
export const person = (id: string): Person | undefined => people.find((p) => p.id === id);
