import { prisma } from "./db";
import { vanToday } from "./dates";

export type MonthRow = {
  id: number;
  index: number;
  label: string;
  startDate: Date;
  endDate: Date;
  fromPayCents: number;
  businessRevenueCents: number;
  cumulativeCents: number;
  payingClients: number;
  contactsMade: number;
  notes: string;
  started: boolean;
};

/**
 * Monthly tracker rows. Business revenue is paid invoices by month paid.
 * "From pay" counts toward the goal once the month has started.
 */
export async function getMonthRows(now: Date = new Date()): Promise<MonthRow[]> {
  const today = vanToday(now);
  const [months, paid, contacts] = await Promise.all([
    prisma.month.findMany({ orderBy: { index: "asc" } }),
    prisma.invoice.findMany({ where: { paidAt: { not: null } }, select: { paidAt: true, amountCents: true, clientId: true } }),
    prisma.activity.findMany({ where: { type: "email" }, select: { date: true } }),
  ]);

  let cumulative = 0;
  return months.map((m) => {
    const inMonth = (d: Date) => d >= m.startDate && d < m.endDate;
    const monthPaid = paid.filter((p) => p.paidAt && inMonth(p.paidAt));
    const businessRevenueCents = monthPaid.reduce((s, p) => s + p.amountCents, 0);
    const started = m.startDate <= today;
    cumulative += (started ? m.fromPayCents : 0) + businessRevenueCents;
    return {
      id: m.id,
      index: m.index,
      label: m.label,
      startDate: m.startDate,
      endDate: m.endDate,
      fromPayCents: m.fromPayCents,
      businessRevenueCents,
      cumulativeCents: cumulative,
      payingClients: new Set(monthPaid.map((p) => p.clientId)).size,
      contactsMade: contacts.filter((c) => inMonth(c.date)).length,
      notes: m.notes,
      started,
    };
  });
}
