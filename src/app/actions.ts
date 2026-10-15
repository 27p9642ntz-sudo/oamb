"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fromDateInput, vanToday } from "@/lib/dates";
import { parseCAD } from "@/lib/money";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function toggleMilestone(id: number) {
  const m = await prisma.milestone.findUniqueOrThrow({ where: { id } });
  await prisma.milestone.update({ where: { id }, data: { doneDate: m.doneDate ? null : vanToday() } });
  revalidatePath("/", "layout");
}

export async function toggleTask(id: number) {
  const t = await prisma.task.findUniqueOrThrow({ where: { id } });
  await prisma.task.update({ where: { id }, data: { done: !t.done, doneAt: t.done ? null : new Date() } });
  revalidatePath("/", "layout");
}

export async function saveSettings(form: FormData) {
  const startDate = fromDateInput(str(form, "startDate"));
  await prisma.goalSettings.update({
    where: { id: 1 },
    data: {
      goalCents: parseCAD(str(form, "goal")),
      targetMonthIndex: Number(str(form, "targetMonthIndex")) || 4,
      monthlyFromPayCents: parseCAD(str(form, "monthlyFromPay")),
      ...(startDate ? { startDate } : {}),
      ownerName: str(form, "ownerName"),
      ownerEmail: str(form, "ownerEmail"),
      ownerPhone: str(form, "ownerPhone"),
      ownerWebsite: str(form, "ownerWebsite"),
      unsubscribeLine: str(form, "unsubscribeLine") || "Not interested? Reply 'no thanks' and I won't contact you again.",
    },
  });
  revalidatePath("/", "layout");
}
