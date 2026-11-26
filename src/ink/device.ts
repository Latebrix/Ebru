/**
 * Phones, tablets and small computers. They get the same pictures, but fewer of them at once:
 * nothing is prepared before it is needed, and what has left the screen gives its memory back.
 */
interface Hints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

let known: boolean | null = null;

export function lightDevice(): boolean {
  if (known === null) {
    const n = navigator as Navigator & Hints;
    known = window.matchMedia('(pointer: coarse)').matches || (n.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2 || n.connection?.saveData === true;
  }
  return known;
}
