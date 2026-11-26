import type { InkState, Marble } from './Marble.ts';
import { leaveSheet, roomFor, takeSheet } from './sheet.ts';

/**
 * Still prints of an ink state, rendered once on the shared sheet and kept as object URLs.
 * Used where a live canvas would be wasteful: sleeves, chips, small papers.
 */
const cache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

/** Resolves when the driver has finished building; nothing blocks in the meantime. */
export const whenReady = (m: Marble) =>
  new Promise<void>((resolve, reject) => {
    const look = () => {
      if (m.prepare()) resolve();
      else if (m.broken || m.lost) reject(new Error('ink is not available'));
      else setTimeout(look, 24);
    };
    look();
  });

async function print(width: number, height: number, state: () => InkState): Promise<string> {
  const m = takeSheet();
  try {
    await whenReady(m);
    const tall = roomFor(m, width, height);
    m.drawViews([{ x: 0, y: 0, w: width, h: height, state: state() }], 1);
    const paper = document.createElement('canvas');
    paper.width = width;
    paper.height = height;
    paper.getContext('2d')!.drawImage(m.canvas, 0, tall - height, width, height, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      paper.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('ink texture failed'))), 'image/webp', 0.94);
    });
  } finally {
    leaveSheet();
  }
}

export function inkTexture(key: string, width: number, height: number, state: () => InkState): Promise<string> {
  const known = cache.get(key);
  if (known) return known;
  const job = queue.then(() => print(width, height, state));
  queue = job.catch(() => undefined);
  cache.set(key, job);
  return job;
}
