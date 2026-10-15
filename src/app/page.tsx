import { prisma } from "@/lib/db";
import { formatDate, vanToday } from "@/lib/dates";
import { getMonthRows } from "@/lib/goal";
import { formatCAD } from "@/lib/money";
import { ComingNext, PageHeader } from "@/components/PageHeader";
import { toggleMilestone } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [settings, rows, milestones, activeClients] = await Promise.all([
    prisma.goalSettings.findUniqueOrThrow({ where: { id: 1 } }),
    getMonthRows(),
    prisma.milestone.findMany({ orderBy: { order: "asc" } }),
    prisma.client.count({ where: { status: "Active" } }),
  ]);
  const today = vanToday();
  const total = rows.filter((r) => r.started).at(-1)?.cumulativeCents ?? 0;
  const remaining = Math.max(0, settings.goalCents - total);
  const pct = Math.min(100, Math.round((total / settings.goalCents) * 100));

  return (
    <>
      <PageHeader title="Goal Dashboard" subtitle={`Today is ${formatDate(today, { weekday: "long", month: "long", day: "numeric" })}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card sm:col-span-2">
          <div className="label">Total toward goal</div>
          <div className="text-3xl font-semibold">
            {formatCAD(total)} <span className="text-base font-normal text-slate-500">of {formatCAD(settings.goalCents)}</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-sm text-slate-500">{pct}% complete. Remaining: {formatCAD(remaining)}</div>
        </div>
        <div className="card">
          <div className="label">Active paying clients</div>
          <div className="text-3xl font-semibold">{activeClients}</div>
          <div className="mt-2 text-sm text-slate-500">Capacity alongside school: 3 to 4</div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Monthly tracker</h2>
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>From pay</th>
                <th>Business revenue</th>
                <th>Cumulative</th>
                <th>Paying clients</th>
                <th>Contacts made</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.started ? "" : "text-slate-400"}>
                  <td className="whitespace-nowrap font-medium">{r.label}</td>
                  <td>{formatCAD(r.fromPayCents)}</td>
                  <td>{formatCAD(r.businessRevenueCents)}</td>
                  <td>{r.started ? formatCAD(r.cumulativeCents) : "Not started"}</td>
                  <td>{r.payingClients}</td>
                  <td>{r.contactsMade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Milestones</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {milestones.map((m) => {
            const overdue = !m.doneDate && m.targetDate < today;
            return (
              <li key={m.id} className="card flex items-start gap-3 py-3">
                <form action={toggleMilestone.bind(null, m.id)}>
                  <button
                    type="submit"
                    aria-label={m.doneDate ? "Mark not done" : "Mark done"}
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${
                      m.doneDate ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {m.doneDate ? "✓" : ""}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${m.doneDate ? "text-slate-400 line-through" : ""}`}>{m.title}</div>
                  <div className="text-xs text-slate-500">
                    Target {formatDate(m.targetDate)}
                    {m.doneDate && ` · Done ${formatDate(m.doneDate)}`}
                  </div>
                </div>
                {overdue && <span className="badge bg-red-100 text-red-700">Overdue</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6">
        <ComingNext phase={4}>Projection, risk status, scenario chart, what-if sliders and weekly outreach stats.</ComingNext>
      </div>
    </>
  );
}
