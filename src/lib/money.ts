const whole = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format integer cents as CA$1,600 (or CA$22.73 when there are cents). */
export function formatCAD(amountCents: number, opts: { forceCents?: boolean } = {}): string {
  const negative = amountCents < 0;
  const abs = Math.abs(amountCents);
  const body = opts.forceCents || abs % 100 !== 0 ? cents.format(abs / 100) : whole.format(abs / 100);
  return `${negative ? "-" : ""}CA$${body}`;
}

/** Parse "1,600", "CA$1600.50" or "1600" into integer cents. */
export function parseCAD(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
