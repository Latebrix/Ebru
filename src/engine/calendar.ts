/** Calendar helpers working in whole UTC days so results never drift with time zones. */

const DAY_MS = 86_400_000;

export function toDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function toIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function weekday(day: number): number {
  return new Date(day * DAY_MS).getUTCDay();
}

/** Working days between two ISO dates, inclusive. */
export function workingDays(fromIso: string, toIsoDate: string, weekend: number[]): number[] {
  const from = toDay(fromIso);
  const to = toDay(toIsoDate);
  const days: number[] = [];
  for (let d = from; d <= to; d += 1) {
    if (!weekend.includes(weekday(d))) days.push(d);
  }
  return days;
}

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayName(iso: string, style: 'long' | 'short' = 'long'): string {
  const d = weekday(toDay(iso));
  return style === 'long' ? WEEKDAY_LONG[d] : WEEKDAY_SHORT[d];
}

/** "Thu 10 Dec" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${weekdayName(iso, 'short')} ${d} ${MONTH_SHORT[m - 1]}`;
}

/** "10 Dec" */
export function dayMonth(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_SHORT[m - 1]}`;
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  return toDay(toIsoDate) - toDay(fromIso);
}
