import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { addDays, vanToday, vanDate } from "../src/lib/dates";
import { parseCSV, toCSV } from "../src/lib/csv";
import { guessMapping, normalizeProvince } from "../src/lib/prospectFields";
import { getOutreachStats } from "../src/lib/outreachStats";
import {
  addActivity,
  buildEmail,
  changeStatus,
  createClientFromProspect,
  isStale,
  logEmailSent,
  markNoThanks,
} from "../src/lib/prospects";

let initialId = 0;
let followUpId = 0;

async function prospect(extra: Record<string, unknown> = {}) {
  return prisma.prospect.create({
    data: {
      businessName: "Peak Roofing",
      niche: "Roofing",
      contactName: "Dana Smith",
      email: "dana@peakroofing.ca",
      city: "Kamloops",
      province: "BC",
      opportunityNotes: "your 4.9 stars aren't showing in any Google ads",
      ...extra,
    },
  });
}

before(async () => {
  await prisma.goalSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, startDate: vanDate(2026, 10, 7), ownerEmail: "owen@example.ca" },
  });
  initialId = (await prisma.emailTemplate.create({ data: { name: "Initial", kind: "initial", subject: "Idea for {{business}}", body: "Hi {{first_name}}, I noticed {{specific_observation}}." } })).id;
  followUpId = (await prisma.emailTemplate.create({ data: { name: "Follow", kind: "follow-up", subject: "Re", body: "Hi {{first_name}}, following up." } })).id;
});

beforeEach(async () => {
  await prisma.task.deleteMany();
  await prisma.client.deleteMany();
  await prisma.prospect.deleteMany();
});

after(() => prisma.$disconnect());

describe("pipeline automation", () => {
  test("moving to Contacted creates a follow-up task due in 3 days", async () => {
    const p = await prospect();
    await changeStatus(p.id, "Contacted");
    const due = addDays(vanToday(), 3);
    const updated = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(updated.followUpDueAt?.getTime(), due.getTime());
    assert.ok(updated.firstContactedAt);
    const tasks = await prisma.task.findMany({ where: { prospectId: p.id } });
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].kind, "follow-up");
    assert.equal(tasks[0].dueDate?.getTime(), due.getTime());
  });

  test("re-entering Contacted does not duplicate the follow-up task", async () => {
    const p = await prospect();
    await changeStatus(p.id, "Contacted");
    await changeStatus(p.id, "New");
    await changeStatus(p.id, "Contacted");
    assert.equal(await prisma.task.count({ where: { prospectId: p.id, done: false } }), 1);
  });

  test("sending the initial template moves New to Contacted and logs a contact", async () => {
    const p = await prospect();
    await logEmailSent(p.id, initialId);
    const updated = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(updated.status, "Contacted");
    assert.equal(await prisma.activity.count({ where: { prospectId: p.id, type: "email" } }), 1);
  });

  test("only one follow-up per contact", async () => {
    const p = await prospect();
    await logEmailSent(p.id, initialId);
    await logEmailSent(p.id, followUpId);
    const updated = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(updated.status, "Follow-up sent");
    assert.equal(await prisma.task.count({ where: { prospectId: p.id, done: false } }), 0);
    await assert.rejects(logEmailSent(p.id, followUpId), /Only one follow-up/);
    await assert.rejects(addActivity(p.id, "follow-up", "manual"), /Only one follow-up/);
    // Going back to Contacted must not schedule another follow-up.
    await changeStatus(p.id, "Contacted");
    assert.equal(await prisma.task.count({ where: { prospectId: p.id, done: false } }), 0);
  });

  test("follow-up with no reply for 7 days is stale", async () => {
    const sent = addDays(new Date(), -8);
    assert.equal(isStale({ status: "Follow-up sent", followUpSentAt: sent }), true);
    assert.equal(isStale({ status: "Follow-up sent", followUpSentAt: addDays(new Date(), -2) }), false);
    assert.equal(isStale({ status: "Replied", followUpSentAt: sent }), false);
  });

  test("logging a reply moves the prospect to Replied and closes the follow-up task", async () => {
    const p = await prospect();
    await changeStatus(p.id, "Contacted");
    await addActivity(p.id, "reply", "Interested");
    const updated = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(updated.status, "Replied");
    assert.equal(await prisma.task.count({ where: { prospectId: p.id, done: false } }), 0);
  });
});

describe("Do not contact", () => {
  test("a Do not contact prospect cannot be emailed from a template", async () => {
    const p = await prospect();
    await markNoThanks(p.id);
    const updated = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(updated.doNotContact, true);
    assert.equal(updated.status, "Do not contact");
    const e = await buildEmail(p.id, initialId);
    assert.equal(e.check.ok, false);
    await assert.rejects(logEmailSent(p.id, initialId), /Do not contact/);
    await assert.rejects(addActivity(p.id, "email", "manual"), /Do not contact/);
    await assert.rejects(changeStatus(p.id, "Contacted"), /Do not contact/);
    assert.equal(await prisma.activity.count({ where: { prospectId: p.id, type: "email" } }), 0);
  });

  test("the flag alone blocks email even if the stage is different", async () => {
    const p = await prospect({ doNotContact: true, status: "Replied" });
    await assert.rejects(logEmailSent(p.id, initialId), /Do not contact/);
  });
});

describe("emails", () => {
  test("every email ends with a signature and opt-out line", async () => {
    const p = await prospect();
    const e = await buildEmail(p.id, initialId);
    assert.match(e.body, /^Hi Dana, I noticed your 4\.9 stars/);
    assert.match(e.body, /owen@example\.ca/);
    assert.match(e.body, /no thanks/);
    assert.deepEqual(e.missing, []);
  });

  test("unfilled merge fields block sending", async () => {
    const p = await prospect({ opportunityNotes: "" });
    await assert.rejects(logEmailSent(p.id, initialId), /specific_observation/);
  });
});

describe("client workspace", () => {
  test("requires Pilot or Paying client, then copies data once", async () => {
    const p = await prospect();
    await assert.rejects(createClientFromProspect(p.id), /Pilot or Paying client/);
    await changeStatus(p.id, "Pilot");
    const c = await createClientFromProspect(p.id);
    assert.equal(c.businessName, "Peak Roofing");
    assert.equal(c.province, "BC");
    assert.equal(c.pilot, true);
    assert.equal(c.monthlyFeeCents, 15000);
    assert.equal(await prisma.checklistItem.count({ where: { clientId: c.id } }), 7);
    const again = await createClientFromProspect(p.id);
    assert.equal(again.id, c.id);
  });
});

describe("stats", () => {
  test("funnel counts the furthest stage reached, even after Lost", async () => {
    const a = await prospect();
    const b = await prospect({ businessName: "B", email: "b@x.ca", province: "AB", niche: "HVAC" });
    await logEmailSent(a.id, initialId);
    await logEmailSent(b.id, initialId);
    await changeStatus(a.id, "Audit booked");
    await changeStatus(a.id, "Lost");
    const s = await getOutreachStats();
    assert.equal(s.funnel.contacted, 2);
    assert.equal(s.funnel.replied, 1);
    assert.equal(s.funnel.audits, 1);
    assert.equal(s.week, 2);
    assert.equal(s.auditsBookedThisWeek, 1);
    assert.equal(s.byProvince.find((r) => r.key === "AB")?.contacted, 1);
  });
});

describe("stats nesting", () => {
  test("prospects that skip stages still count in every earlier step", async () => {
    const a = await prospect();
    const b = await prospect({ businessName: "B", email: "b@x.ca" });
    await changeStatus(a.id, "Pilot");
    await markNoThanks(b.id);
    const s = await getOutreachStats();
    assert.equal(s.funnel.contacted, 2);
    assert.equal(s.funnel.replied, 2);
    assert.equal(s.funnel.clients, 1);
    assert.ok(s.replyRate! <= 1);
    // Contacts made (sent emails) is unaffected: nothing was emailed from the app.
    assert.equal(s.week, 0);
  });
});

describe("csv", () => {
  test("round-trips quotes, commas and newlines", () => {
    const csv = toCSV(["Business name", "Notes"], [["A, Inc", 'Said "hi"\nthen left']]);
    assert.deepEqual(parseCSV(csv), [["Business name", "Notes"], ["A, Inc", 'Said "hi"\nthen left']]);
  });

  test("guesses column mapping and normalizes provinces", () => {
    const m = guessMapping(["Company", "E-mail", "Town", "Province", "Reviews"]);
    assert.equal(m.businessName, 0);
    assert.equal(m.email, 1);
    assert.equal(m.city, 2);
    assert.equal(m.province, 3);
    assert.equal(m.reviewCount, 4);
    assert.equal(normalizeProvince("British Columbia"), "BC");
    assert.equal(normalizeProvince("Québec"), "QC");
    assert.equal(normalizeProvince("on"), "ON");
  });
});
