import { prisma } from "@/lib/db";
import { composeEmail, fillTemplate } from "@/lib/templates";
import { ComingNext, PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const SAMPLE = {
  first_name: "Sam",
  business: "Maple Ridge Landscaping",
  city: "Kamloops",
  service: "landscaping",
  specific_observation: "you have 4.8 stars from 60 reviews but no Google ads showing for \"landscaping Kamloops\"",
};

export default async function OutreachPage() {
  const [templates, settings] = await Promise.all([
    prisma.emailTemplate.findMany({ orderBy: { id: "asc" } }),
    prisma.goalSettings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);

  return (
    <>
      <PageHeader title="Outreach CRM" subtitle="Cold email to higher-value home service businesses across Canada" />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Email templates</h2>
        <p className="mb-3 text-sm text-slate-500">
          Preview uses sample data. The signature and opt-out line are added to every email automatically (CASL). Edit your
          contact details in Settings.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <article key={t.id} className="card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{t.name}</h3>
                <span className="badge bg-slate-100 text-slate-600">{t.kind}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Subject: </span>
                {fillTemplate(t.subject, SAMPLE)}
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-700">
                {composeEmail(t.body, SAMPLE, settings)}
              </pre>
            </article>
          ))}
        </div>
      </section>
      <div className="mt-6">
        <ComingNext phase={2}>Prospect list, Kanban pipeline, filters, follow-up automation, template editing, mailto sending, CSV import/export and outreach stats.</ComingNext>
      </div>
    </>
  );
}
