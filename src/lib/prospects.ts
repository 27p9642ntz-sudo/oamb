// Outreach CRM rules. Pages and server actions call these so the automation
// (follow-up tasks, one follow-up per contact, Do not contact blocking) lives
// in one place.
import type { Prisma, Prospect } from "@prisma/client";
import { prisma } from "./db";
import { addDays, addMonths, vanToday } from "./dates";
import { PIPELINE_STAGES, type PipelineStage } from "./constants";
import { composeEmail, fillTemplate, unfilledFields, type MergeData } from "./templates";

export const FOLLOW_UP_AFTER_DAYS = 3;
export const LOST_AFTER_DAYS = 7;

/** Stages that count as a reply or later in the funnel. */
export const REPLIED_OR_LATER: PipelineStage[] = ["Replied", "Audit booked", "Audit done", "Proposal sent", "Pilot", "Paying client"];

export class CrmError extends Error {}

export function isStage(s: string): s is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(s);
}

async function logActivity(tx: Prisma.TransactionClient, prospectId: number, type: string, note = "", date = new Date()) {
  await tx.activity.create({ data: { prospectId, type, note, date } });
  await tx.prospect.update({ where: { id: prospectId }, data: { lastActivityAt: date } });
}

async function closeFollowUpTasks(tx: Prisma.TransactionClient, prospectId: number) {
  await tx.task.updateMany({
    where: { prospectId, kind: "follow-up", done: false },
    data: { done: true, doneAt: new Date() },
  });
}

/**
 * Move a prospect to a new pipeline stage and apply the automation:
 * - Contacted: stamp first contact, follow-up due in 3 days, create a follow-up task (once).
 * - Follow-up sent: record the single follow-up and close the follow-up task.
 * - Replied or later, Lost, Do not contact: close any open follow-up task.
 * - Do not contact: set the flag. Leaving Do not contact clears it.
 */
export async function changeStatus(prospectId: number, status: string, now: Date = new Date()) {
  if (!isStage(status)) throw new CrmError(`Unknown stage: ${status}`);
  return prisma.$transaction(async (tx) => {
    const p = await tx.prospect.findUniqueOrThrow({ where: { id: prospectId } });
    if (p.status === status) return p;
    if (p.doNotContact && status !== "Do not contact" && ["Contacted", "Follow-up sent"].includes(status)) {
      throw new CrmError("This prospect is marked Do not contact.");
    }

    const data: Prisma.ProspectUpdateInput = { status };

    if (status === "Contacted") {
      if (!p.firstContactedAt) data.firstContactedAt = now;
      // Only one follow-up per contact: never schedule another once it has been sent.
      if (!p.followUpSentAt) {
        const due = addDays(vanToday(now), FOLLOW_UP_AFTER_DAYS);
        data.followUpDueAt = due;
        const existing = await tx.task.findFirst({ where: { prospectId, kind: "follow-up", done: false } });
        if (existing) {
          await tx.task.update({ where: { id: existing.id }, data: { dueDate: due } });
        } else {
          await tx.task.create({
            data: {
              title: `Send follow-up to ${p.businessName}`,
              category: "Outreach",
              priority: "High",
              kind: "follow-up",
              dueDate: due,
              prospectId,
            },
          });
        }
      }
    } else if (status === "Follow-up sent") {
      if (!p.firstContactedAt) data.firstContactedAt = now;
      data.followUpSentAt = p.followUpSentAt ?? now;
      data.followUpDueAt = null;
      await closeFollowUpTasks(tx, prospectId);
    } else if (status !== "New") {
      data.followUpDueAt = null;
      await closeFollowUpTasks(tx, prospectId);
    }

    if (status === "Do not contact") data.doNotContact = true;
    else if (p.status === "Do not contact") data.doNotContact = false;

    const updated = await tx.prospect.update({ where: { id: prospectId }, data });
    await logActivity(tx, prospectId, "status", status, now);
    return updated;
  });
}

/**
 * Log a manual activity. Emails follow the same rules as template sends;
 * a reply moves Contacted or Follow-up sent prospects to Replied.
 */
export async function addActivity(prospectId: number, type: string, note: string, now: Date = new Date()) {
  const p = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  if (type === "email" || type === "follow-up") {
    const check = canEmail({ ...p, email: p.email || "manual" }, type);
    if (!check.ok) throw new CrmError(check.reason);
  }
  await prisma.$transaction((tx) => logActivity(tx, prospectId, type, note, now));
  if (type === "reply" && (p.status === "Contacted" || p.status === "Follow-up sent")) {
    await changeStatus(prospectId, "Replied", now);
  } else if (type === "email" && p.status === "New") {
    await changeStatus(prospectId, "Contacted", now);
  } else if (type === "email" && !p.firstContactedAt) {
    await prisma.prospect.update({ where: { id: prospectId }, data: { firstContactedAt: now } });
  } else if (type === "follow-up") {
    await changeStatus(prospectId, "Follow-up sent", now);
  }
}

/** They replied "no thanks": log it and block further email. */
export async function markNoThanks(prospectId: number, now: Date = new Date()) {
  await prisma.$transaction((tx) => logActivity(tx, prospectId, "reply", "Replied no thanks. Marked Do not contact.", now));
  await changeStatus(prospectId, "Do not contact", now);
}

export function mergeDataFor(p: Pick<Prospect, "contactName" | "businessName" | "city" | "niche" | "opportunityNotes">): MergeData {
  return {
    first_name: p.contactName.trim().split(/\s+/)[0] || "there",
    business: p.businessName,
    city: p.city,
    service: p.niche && p.niche !== "Other" ? p.niche.toLowerCase() : "",
    specific_observation: p.opportunityNotes.trim().replace(/[.\s]+$/, ""),
  };
}

export type EmailCheck = { ok: true } | { ok: false; reason: string };

export function canEmail(p: Pick<Prospect, "doNotContact" | "status" | "email" | "followUpSentAt">, kind: string): EmailCheck {
  if (p.doNotContact || p.status === "Do not contact") return { ok: false, reason: "Marked Do not contact. Emailing is blocked." };
  if (!p.email.trim()) return { ok: false, reason: "No email address on file." };
  if (kind === "follow-up" && p.followUpSentAt) return { ok: false, reason: "A follow-up was already sent. Only one follow-up per contact." };
  return { ok: true };
}

/** Build the filled email for a prospect, or explain why it cannot be sent. */
export async function buildEmail(prospectId: number, templateId: number) {
  const [p, t, sender] = await Promise.all([
    prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } }),
    prisma.emailTemplate.findUniqueOrThrow({ where: { id: templateId } }),
    prisma.goalSettings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  const data = mergeDataFor(p);
  const subject = fillTemplate(t.subject, data);
  const body = composeEmail(t.body, data, sender);
  const missing = unfilledFields(subject + body);
  const check = canEmail(p, t.kind);
  return { prospect: p, template: t, subject, body, missing, check };
}

/** Record that a template email was sent. Refuses Do not contact, missing fields and second follow-ups. */
export async function logEmailSent(prospectId: number, templateId: number, now: Date = new Date()) {
  const { prospect, template, missing, check } = await buildEmail(prospectId, templateId);
  if (!check.ok) throw new CrmError(check.reason);
  if (missing.length) throw new CrmError(`Fill in: ${missing.join(", ")}`);

  const isFollowUp = template.kind === "follow-up";
  await prisma.$transaction((tx) =>
    logActivity(tx, prospectId, isFollowUp ? "follow-up" : "email", `Sent "${template.name}"`, now),
  );
  if (isFollowUp) {
    await changeStatus(prospectId, "Follow-up sent", now);
  } else if (prospect.status === "New") {
    await changeStatus(prospectId, "Contacted", now);
  } else if (!prospect.firstContactedAt) {
    await prisma.prospect.update({ where: { id: prospectId }, data: { firstContactedAt: now } });
  }
}

/** Follow-up sent 7+ days ago with no reply: prompt to mark Lost. */
export function isStale(p: Pick<Prospect, "status" | "followUpSentAt">, now: Date = new Date()): boolean {
  return p.status === "Follow-up sent" && !!p.followUpSentAt && p.followUpSentAt <= addDays(now, -LOST_AFTER_DAYS);
}

export function isFollowUpDue(p: Pick<Prospect, "status" | "followUpDueAt" | "followUpSentAt">, now: Date = new Date()): boolean {
  return p.status === "Contacted" && !p.followUpSentAt && !!p.followUpDueAt && p.followUpDueAt <= vanToday(now);
}

export const ONBOARDING_ITEMS = [
  "Agreement signed (scope, price, 3-month minimum, client pays ad spend directly, client owns accounts and data, 30 days' notice after minimum)",
  "Google Ads manager access granted (client invites Owen; never create accounts in Owen's name)",
  "Meta Business Manager partner access granted",
  "Meta Pixel installed",
  "Google Ads conversion tracking set up (forms, calls, bookings)",
  "Success metric agreed",
  "First invoice sent",
];

/** Copy a Pilot or Paying client prospect into a new client workspace. Returns the existing one if already created. */
export async function createClientFromProspect(prospectId: number, now: Date = new Date()) {
  const existing = await prisma.client.findFirst({ where: { prospectId } });
  if (existing) return existing;
  const p = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  if (p.status !== "Pilot" && p.status !== "Paying client") {
    throw new CrmError("Move the prospect to Pilot or Paying client first.");
  }
  const pilot = p.status === "Pilot";
  const start = vanToday(now);
  return prisma.client.create({
    data: {
      prospectId,
      businessName: p.businessName,
      niche: p.niche,
      contactName: p.contactName,
      email: p.email,
      phone: p.phone,
      website: p.website,
      city: p.city,
      province: p.province,
      pilot,
      monthlyFeeCents: pilot ? 15000 : 40000,
      startDate: start,
      minTermEndDate: addMonths(start, 3),
      status: "Onboarding",
      auditNotes: JSON.stringify({ opportunityNotes: p.opportunityNotes, notes: p.notes }),
      checklist: { create: ONBOARDING_ITEMS.map((label, order) => ({ type: "onboarding", label, order })) },
    },
  });
}
