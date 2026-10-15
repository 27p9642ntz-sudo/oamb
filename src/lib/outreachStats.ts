import { prisma } from "./db";
import { addDays, vanParts, vanToday } from "./dates";
import { PIPELINE_STAGES } from "./constants";

/** Monday 00:00 of the current week in Vancouver. */
export function weekStart(now: Date = new Date()): Date {
  const today = vanToday(now);
  const wd = vanParts(today).weekday; // 0 = Sunday
  return addDays(today, -((wd + 6) % 7));
}

const stageIndex = (s: string) => PIPELINE_STAGES.indexOf(s as (typeof PIPELINE_STAGES)[number]);
const IDX = {
  contacted: stageIndex("Contacted"),
  replied: stageIndex("Replied"),
  audit: stageIndex("Audit booked"),
  proposal: stageIndex("Proposal sent"),
  client: stageIndex("Pilot"),
  lastMain: stageIndex("Paying client"),
};

export type FunnelCounts = { contacted: number; replied: number; audits: number; proposals: number; clients: number };

export type GroupRow = FunnelCounts & { key: string; total: number };

export type OutreachStats = {
  today: number;
  week: number;
  followUpsThisWeek: number;
  auditsBookedThisWeek: number;
  funnel: FunnelCounts;
  replyRate: number | null;
  contactsPerClient: number | null;
  byNiche: GroupRow[];
  byProvince: GroupRow[];
};

export async function getOutreachStats(now: Date = new Date()): Promise<OutreachStats> {
  const today = vanToday(now);
  const monday = weekStart(now);
  const [prospects, activities] = await Promise.all([
    prisma.prospect.findMany({ select: { id: true, niche: true, province: true, status: true, firstContactedAt: true } }),
    prisma.activity.findMany({ select: { prospectId: true, type: true, note: true, date: true } }),
  ]);

  // Furthest main-pipeline stage each prospect ever reached, from status history and current status.
  const furthest = new Map<number, number>();
  const replied = new Set<number>();
  const bump = (id: number, stage: string) => {
    const i = stageIndex(stage);
    if (i >= 0 && i <= IDX.lastMain) furthest.set(id, Math.max(furthest.get(id) ?? 0, i));
  };
  for (const p of prospects) bump(p.id, p.status);
  for (const a of activities) {
    if (a.type === "status") bump(a.prospectId, a.note);
    if (a.type === "reply") replied.add(a.prospectId);
  }

  const countFor = (list: typeof prospects): FunnelCounts => {
    const c = { contacted: 0, replied: 0, audits: 0, proposals: 0, clients: 0 };
    for (const p of list) {
      // Nested funnel: reaching a later stage implies every earlier one.
      const f = furthest.get(p.id) ?? 0;
      const didReply = f >= IDX.replied || replied.has(p.id);
      if (p.firstContactedAt || f >= IDX.contacted || didReply) c.contacted++;
      if (didReply) c.replied++;
      if (f >= IDX.audit) c.audits++;
      if (f >= IDX.proposal) c.proposals++;
      if (f >= IDX.client) c.clients++;
    }
    return c;
  };

  const group = (keyOf: (p: (typeof prospects)[number]) => string): GroupRow[] => {
    const buckets = new Map<string, typeof prospects>();
    for (const p of prospects) {
      const k = keyOf(p) || "Unknown";
      buckets.set(k, [...(buckets.get(k) ?? []), p]);
    }
    return Array.from(buckets, ([key, list]) => ({ key, total: list.length, ...countFor(list) })).sort(
      (a, b) => b.contacted - a.contacted || a.key.localeCompare(b.key),
    );
  };

  const funnel = countFor(prospects);
  const inRange = (d: Date, from: Date) => d >= from;
  return {
    today: activities.filter((a) => a.type === "email" && inRange(a.date, today)).length,
    week: activities.filter((a) => a.type === "email" && inRange(a.date, monday)).length,
    followUpsThisWeek: activities.filter((a) => a.type === "follow-up" && inRange(a.date, monday)).length,
    auditsBookedThisWeek: activities.filter((a) => a.type === "status" && a.note === "Audit booked" && inRange(a.date, monday)).length,
    funnel,
    replyRate: funnel.contacted ? funnel.replied / funnel.contacted : null,
    contactsPerClient: funnel.clients ? funnel.contacted / funnel.clients : null,
    byNiche: group((p) => p.niche),
    byProvince: group((p) => p.province),
  };
}

export const pct = (n: number | null) => (n === null ? "n/a" : `${Math.round(n * 100)}%`);
export const rate = (num: number, den: number) => (den ? pct(num / den) : "n/a");
