"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fromDateInput } from "@/lib/dates";
import {
  CrmError,
  addActivity,
  changeStatus,
  createClientFromProspect,
  logEmailSent,
  markNoThanks,
} from "@/lib/prospects";
import {
  normalizeProvince,
  normalizeQuality,
  normalizeYesNo,
  type ProspectFieldKey,
} from "@/lib/prospectFields";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (s: string) => (s === "" || !Number.isFinite(Number(s)) ? null : Number(s));

function refresh() {
  revalidatePath("/", "layout");
}

async function attempt(fn: () => Promise<unknown>, message?: string): Promise<ActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true, message };
  } catch (e) {
    if (e instanceof CrmError) return { ok: false, error: e.message };
    throw e;
  }
}

function prospectData(f: FormData) {
  const rating = num(str(f, "googleRating"));
  const reviews = num(str(f, "reviewCount"));
  return {
    businessName: str(f, "businessName"),
    niche: str(f, "niche"),
    contactName: str(f, "contactName"),
    role: str(f, "role"),
    email: str(f, "email"),
    phone: str(f, "phone"),
    website: str(f, "website"),
    instagram: str(f, "instagram"),
    city: str(f, "city"),
    province: normalizeProvince(str(f, "province")),
    googleRating: rating === null ? null : Math.min(5, Math.max(0, rating)),
    reviewCount: reviews === null ? null : Math.max(0, Math.round(reviews)),
    runningGoogleAds: normalizeYesNo(str(f, "runningGoogleAds")),
    runningMetaAds: normalizeYesNo(str(f, "runningMetaAds")),
    websiteQuality: normalizeQuality(str(f, "websiteQuality")),
    opportunityNotes: str(f, "opportunityNotes"),
    source: str(f, "source"),
    notes: str(f, "notes"),
  };
}

export async function createProspect(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const data = prospectData(form);
  if (!data.businessName) return { ok: false, error: "Business name is required." };
  const p = await prisma.prospect.create({ data });
  refresh();
  redirect(`/outreach/${p.id}`);
}

export async function updateProspect(id: number, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const data = prospectData(form);
  if (!data.businessName) return { ok: false, error: "Business name is required." };
  const followUpDueAt = fromDateInput(str(form, "followUpDueAt"));
  await prisma.$transaction(async (tx) => {
    await tx.prospect.update({ where: { id }, data: { ...data, followUpDueAt } });
    // Keep the open follow-up task in step with an edited due date.
    if (followUpDueAt) {
      await tx.task.updateMany({ where: { prospectId: id, kind: "follow-up", done: false }, data: { dueDate: followUpDueAt } });
    }
  });
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteProspect(id: number) {
  await prisma.prospect.delete({ where: { id } });
  refresh();
  redirect("/outreach?view=table");
}

export async function setStatus(id: number, status: string): Promise<ActionResult> {
  return attempt(() => changeStatus(id, status));
}

export async function logActivityAction(id: number, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const type = str(form, "type") || "note";
  const note = str(form, "note");
  if (!["email", "follow-up", "reply", "call", "note"].includes(type)) return { ok: false, error: "Unknown activity type." };
  return attempt(() => addActivity(id, type, note), "Logged.");
}

export async function noThanksAction(id: number): Promise<ActionResult> {
  return attempt(() => markNoThanks(id), "Marked Do not contact.");
}

export async function logSentAction(prospectId: number, templateId: number): Promise<ActionResult> {
  return attempt(() => logEmailSent(prospectId, templateId), "Send logged.");
}

export async function createClientAction(prospectId: number): Promise<ActionResult> {
  let clientId = 0;
  const res = await attempt(async () => {
    clientId = (await createClientFromProspect(prospectId)).id;
  });
  if (!res.ok) return res;
  redirect(`/clients?created=${clientId}`);
}

export async function saveTemplate(id: number | null, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const data = { name: str(form, "name"), kind: str(form, "kind") || "initial", subject: str(form, "subject"), body: String(form.get("body") ?? "").trim() };
  if (!data.name || !data.subject || !data.body) return { ok: false, error: "Name, subject and body are required." };
  if (id) await prisma.emailTemplate.update({ where: { id }, data });
  else await prisma.emailTemplate.create({ data });
  refresh();
  return { ok: true, message: "Template saved." };
}

export async function deleteTemplate(id: number) {
  await prisma.emailTemplate.delete({ where: { id } });
  refresh();
}

export type ImportRow = Partial<Record<ProspectFieldKey, string>>;

export async function importProspects(rows: ImportRow[]): Promise<{ created: number; skipped: { row: number; reason: string }[] }> {
  const existing = await prisma.prospect.findMany({ select: { email: true, businessName: true, city: true } });
  const emails = new Set(existing.map((p) => p.email.toLowerCase()).filter(Boolean));
  const names = new Set(existing.map((p) => `${p.businessName}|${p.city}`.toLowerCase()));
  const skipped: { row: number; reason: string }[] = [];
  const toCreate: Prisma.ProspectCreateManyInput[] = [];

  rows.forEach((r, i) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(r)) form.set(k, v ?? "");
    const data = prospectData(form);
    const emailKey = data.email.toLowerCase();
    const nameKey = `${data.businessName}|${data.city}`.toLowerCase();
    if (!data.businessName) return skipped.push({ row: i + 2, reason: "No business name" });
    if (emailKey && emails.has(emailKey)) return skipped.push({ row: i + 2, reason: `Duplicate email ${data.email}` });
    if (names.has(nameKey)) return skipped.push({ row: i + 2, reason: `Already have ${data.businessName}${data.city ? ` in ${data.city}` : ""}` });
    if (emailKey) emails.add(emailKey);
    names.add(nameKey);
    toCreate.push({ ...data, source: data.source || "CSV import" });
  });

  if (toCreate.length) await prisma.prospect.createMany({ data: toCreate });
  refresh();
  return { created: toCreate.length, skipped };
}
