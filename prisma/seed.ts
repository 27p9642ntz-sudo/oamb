import { PrismaClient } from "@prisma/client";
import { vanDate } from "../src/lib/dates";

const prisma = new PrismaClient();

// Business start: October 7, 2026 (America/Vancouver).
const START = { y: 2026, m: 10, d: 7 };
const d = (y: number, m: number, day: number) => vanDate(y, m, day);
const week = (n: number) => d(START.y, START.m, START.d + 7 * n);
const month = (n: number) => d(START.y, START.m + n, START.d);

async function main() {
  await prisma.goalSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      goalCents: 400000,
      targetMonthIndex: 4,
      startDate: d(START.y, START.m, START.d),
      monthlyFromPayCents: 60000,
      ownerName: "Owen McIntyre",
    },
  });

  if ((await prisma.month.count()) === 0) {
    const labels = ["Oct/Nov 2026", "Nov/Dec 2026", "Dec 2026/Jan 2027", "Jan/Feb 2027"];
    for (let i = 0; i < labels.length; i++) {
      await prisma.month.create({
        data: {
          index: i + 1,
          label: `Month ${i + 1} (${labels[i]})`,
          startDate: month(i),
          // End is exclusive: the start of the next month.
          endDate: month(i + 1),
          fromPayCents: 60000,
        },
      });
    }
  }

  if ((await prisma.milestone.count()) === 0) {
    const milestones: [string, Date][] = [
      ["Niche chosen and Carrd site live", week(1)],
      ["Google Ads Search certification and Meta Blueprint courses done", week(2)],
      ["50-business prospect list built", week(2)],
      ["First pilot client signed", month(1)],
      ["First paying client at CA$400/month", month(2)],
      ["Second paying client", month(3)],
      ["First case study published with a quotable result", month(3)],
      ["CA$4,000 reached", month(4)],
    ];
    await prisma.milestone.createMany({
      data: milestones.map(([title, targetDate], i) => ({ order: i + 1, title, targetDate })),
    });
  }

  if ((await prisma.task.count({ where: { category: { in: ["Setup", "Admin"] } } })) === 0) {
    const tasks: { title: string; category: string; dueDate: Date; priority: string; notes?: string }[] = [
      { title: "Google Skillshop: Google Ads Search certification", category: "Setup", dueDate: week(2), priority: "High" },
      { title: "Google Skillshop: Google Ads Measurement certification", category: "Setup", dueDate: week(2), priority: "Medium", notes: "Do after the Search certification." },
      { title: "Meta Blueprint: Ads Manager course", category: "Setup", dueDate: week(2), priority: "High" },
      { title: "Meta Blueprint: lead ads course", category: "Setup", dueDate: week(2), priority: "Medium" },
      { title: "Meta Blueprint: Meta Pixel course", category: "Setup", dueDate: week(2), priority: "Medium" },
      { title: "Watch 2 to 3 full campaign setups", category: "Setup", dueDate: week(2), priority: "Medium" },
      { title: "Build Carrd one-page site with offer and contact form", category: "Setup", dueDate: week(1), priority: "High", notes: "About CA$25/year." },
      { title: "Create Google Ads manager account", category: "Setup", dueDate: week(1), priority: "High" },
      { title: "Set up Meta Business Manager", category: "Setup", dueDate: week(1), priority: "High" },
      { title: "Optional: Google Business Profile", category: "Setup", dueDate: month(1), priority: "Low" },
      { title: "Optional: BC business name registration", category: "Admin", dueDate: month(1), priority: "Low", notes: "About CA$70." },
      { title: "Set up invoicing in Wave (or Stripe)", category: "Admin", dueDate: week(3), priority: "Medium" },
      { title: "Write one-page client agreement template", category: "Admin", dueDate: week(3), priority: "Medium", notes: "Scope, price, 3-month minimum, client pays ad spend directly, client owns accounts and data, 30 days' notice after minimum." },
    ];
    await prisma.task.createMany({ data: tasks.map((t) => ({ ...t, notes: t.notes ?? "" })) });
  }

  if ((await prisma.emailTemplate.count()) === 0) {
    await prisma.emailTemplate.createMany({
      data: [
        {
          name: "Initial cold email",
          kind: "initial",
          subject: "Quick idea for {{business}}",
          body:
            "Hi {{first_name}}, I'm Owen, a business student who runs Google and Meta ads for local service businesses.\n\n" +
            "I noticed {{specific_observation}}. I'd like to offer a free 15-minute audit with 2 to 3 changes that could bring in more calls and bookings for {{business}}. Would Tuesday or Thursday work?",
        },
        {
          name: "Follow-up",
          kind: "follow-up",
          subject: "Re: Quick idea for {{business}}",
          body:
            "Hi {{first_name}}, just following up on my note from last week.\n\n" +
            "I still think a few quick changes could bring in more {{service}} calls in {{city}} for {{business}}. The free 15-minute audit offer stands, and I'll keep it short. Would this week or next work better?",
        },
      ],
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
