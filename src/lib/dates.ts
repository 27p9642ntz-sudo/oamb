// All dates are displayed in America/Vancouver. Stored values are UTC.
export const TZ = "America/Vancouver";

/** Offset in minutes between UTC and Vancouver at the given instant. */
function tzOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - at.getTime()) / 60000;
}

/** Midnight in Vancouver on the given calendar date (month is 1-based). */
export function vanDate(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day));
  const offset = tzOffsetMinutes(guess);
  const result = new Date(guess.getTime() - offset * 60000);
  // Re-check in case the guess straddled a DST change.
  const offset2 = tzOffsetMinutes(result);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

/** Vancouver calendar parts for an instant. */
export function vanParts(at: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdays.indexOf(get("weekday")),
  };
}

/** Start of today in Vancouver. */
export function vanToday(now: Date = new Date()): Date {
  const p = vanParts(now);
  return vanDate(p.year, p.month, p.day);
}

/** Add calendar days, keeping Vancouver midnight alignment. */
export function addDays(date: Date, days: number): Date {
  const p = vanParts(date);
  return vanDate(p.year, p.month, p.day + days);
}

/** Add calendar months, keeping Vancouver midnight alignment. */
export function addMonths(date: Date, months: number): Date {
  const p = vanParts(date);
  return vanDate(p.year, p.month + months, p.day);
}

export function formatDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  return formatDate(d, { hour: "numeric", minute: "2-digit" });
}

/** YYYY-MM-DD in Vancouver, for <input type="date"> values. */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const p = vanParts(typeof d === "string" ? new Date(d) : d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Parse a YYYY-MM-DD input value as Vancouver midnight. */
export function fromDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return vanDate(y, m, d);
}
