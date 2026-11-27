import { HEX, MEMBER_INK, onInk, type InkName } from '../brand/palette.ts';
import { team } from '../data/atlas.ts';

/** A person as the interface draws them: their ink, and a portrait. */
export interface Person {
  id: string;
  name: string;
  first: string;
  role: string;
  ink: InkName;
  hex: string;
  text: string;
  portrait: string;
}

/** Portraits are paper collages of nobody in particular. */
const CAMEO: Record<string, number> = { laila: 3, omar: 4, nour: 11, youssef: 1, karim: 12 };

/** The sample team. The open workspace's people are in the store (usePeople). */
export const demoPeople: Person[] = team.members.map((m) => ({
  id: m.id,
  name: m.name,
  first: m.first,
  role: m.role,
  ink: MEMBER_INK[m.id] as InkName,
  hex: HEX[MEMBER_INK[m.id]],
  text: onInk(MEMBER_INK[m.id]),
  portrait: `./ebru/show/cameo-${CAMEO[m.id]}.webp`,
}));

/** Finds a person in a list. */
export const personIn = (people: Person[], id: string | undefined): Person | undefined => people.find((p) => p.id === id);
