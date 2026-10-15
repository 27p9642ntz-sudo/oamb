import { prisma } from "@/lib/db";
import { formatCAD } from "@/lib/money";
import { ComingNext, PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Clients" subtitle="A workspace per client" />
      {clients.length === 0 ? (
        <div className="card text-sm text-slate-500">
          No clients yet. Once outreach is live, move a prospect to Pilot or Paying client and create a workspace from there.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <li key={c.id} className="card">
              <div className="font-medium">{c.businessName}</div>
              <div className="text-sm text-slate-500">
                {[c.city, c.province].filter(Boolean).join(", ")} · {formatCAD(c.monthlyFeeCents)}/month · {c.status}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <ComingNext phase={5}>Overview, onboarding checklist and invoices wired to the dashboard. Phase 6 adds campaigns, optimization log, metrics, reports and case studies.</ComingNext>
      </div>
    </>
  );
}
