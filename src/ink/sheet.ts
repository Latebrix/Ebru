import { Marble } from './Marble.ts';

/**
 * One off-screen canvas for everything that is printed and then copied: bars, jars, windows, small
 * papers. A phone can only hold a few drawing contexts, so all of these share one. Whoever prints
 * copies at once, so nobody sees anybody else's ink.
 */
let sheet: Marble | null = null;
let users = 0;

export function takeSheet(): Marble {
  sheet ??= new Marble(document.createElement('canvas'), { preserve: true });
  users += 1;
  return sheet;
}

export function leaveSheet() {
  users -= 1;
  window.setTimeout(() => {
    if (users > 0 || !sheet) return;
    sheet.dispose();
    sheet = null;
  }, 12000);
}

/** The sheet only grows, because changing the size of a canvas is expensive. Returns its height. */
export function roomFor(m: Marble, width: number, height: number): number {
  const { canvas } = m;
  if (canvas.width < width || canvas.height < height) m.resize(Math.max(canvas.width, Math.ceil(width)), Math.max(canvas.height, Math.ceil(height)));
  return canvas.height;
}
