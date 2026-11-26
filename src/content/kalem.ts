/**
 * Kalem's recorded lines, in two voices: `atlas` is the low one, `aurora` the high one. Change VOICE
 * to switch the deck, the website and the first choice of the online presentation.
 * The lines are cut by scripts/kalem-voice.ts.
 */
import lines from './kalem.json';

export type VoiceId = keyof typeof lines;
export const VOICE: VoiceId = 'atlas';

export interface KalemLine {
  text: string;
  file: string;
  duration: number;
  /** Word, start and end in seconds. */
  words: [string, number, number][];
}

export type LineId = keyof (typeof lines)[typeof VOICE];
export const KALEM = lines[VOICE] as unknown as Record<LineId, KalemLine>;
