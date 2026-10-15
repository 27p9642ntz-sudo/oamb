import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { DAILY_CONTACT_TARGET, WEEKLY_CONTACT_TARGET } from "@/lib/constants";
import { filterQuery, parseFilters, prospectOrderBy, prospectWhere, type ProspectFilters } from "@/lib/prospectQuery";
import { isFollowUpDue, isStale } from "@/lib/prospects";
import { getOutreachStats, pct, rate, type GroupRow } from "@/lib/outreachStats";
import { signatureBlock } from "@/lib/templates";
import { PageHeader } from "@/components/PageHeader";
import { Board } from "@/components/outreach/Board";
import { FilterBar } from "@/components/outreach/FilterBar";
import { StatusBadge } from "@/components/outreach/StatusBadge";
import { TemplateEditor } from "@/components/outreach/TemplateEditor";

export const dynamic = "force-dynamic";

const VIEWS = [
  ["board", "Pipeline"],
  ["table", "Table"],
  ["stats", "Stats"],
  ["templates", "Templates"],
] as const;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function OutreachPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const view = VIEWS.some(([v]) => v === params.view) ? (params.view as string) : "board";
  const f = parseFilters(params);

  const [stats, attention] = await Promise.all([
    getOutreachStats(),
    prisma.prospect.findMany({ where: { status: { in: ["Contacted", "Follow-up sent"] } }, orderBy: { followUpDueAt: "asc" } }),
  ]);
  const due = attention.filter((p) => isFollowUpDue(p));
  const stale = attention.filter((p) => isStale(p));

  return (
    <>
      <PageHeader
        title="Outreach CRM"
        subtitle="Cold email to higher-value home service businesses across Canada"
        actions={
          <>
            <Link className="btn" href="/outreach/new">Add prospect</Link>
            <Link className="btn-secondary" href="/outreach/import">Import CSV</Link>
            <a className="btn-secondary" href={`/outreach/export${filterQuery(f)}`}>Export CSV</a>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sent today" value={`${stats.today} / ${DAILY_CONTACT_TARGET}`} good={stats.today >= DAILY_CONTACT_TARGET} />
        <Stat label="Sent this week" value={`${stats.week} / ${WEEKLY_CONTACT_TARGET}`} good={stats.week >= WEEKLY_CONTACT_TARGET} />
        <Stat label="Follow-ups this week" value={String(stats.followUpsThisWeek)} />
        <Stat label="Audits booked this week" value={`${stats.auditsBookedThisWeek} / 2 to 3`} good={stats.auditsBookedThisWeek >= 2} />
      </div>

      {(due.length > 0 || stale.length > 0) && (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {due.length > 0 && (
            <AttentionList title={`Follow-ups due (${due.length})`} tone="amber" items={due.map((p) => ({ id: p.id, name: p.businessName, detail: `Due ${formatDate(p.followUpDueAt)}` }))} />
          )}
          {stale.length > 0 && (
            <AttentionList title={`No reply 7 days after follow-up (${stale.length}). Mark Lost?`} tone="red" items={stale.map((p) => ({ id: p.id, name: p.businessName, detail: `Follow-up ${formatDate(p.followUpSentAt)}` }))} />
          )}
        </div>
      )}

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {VIEWS.map(([v, label]) => (
          <Link
            key={v}
            href={v === "board" || v === "table" ? `/outreach${filterQuery({ ...f, sort: v === "table" ? f.sort : undefined }, { view: v })}` : `/outreach?view=${v}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap ${view === v ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {view === "board" && <BoardView f={f} />}
      {view === "table" && <TableView f={f} />}
      {view === "stats" && <StatsView stats={stats} />}
      {view === "templates" && <TemplatesView />}
    </>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="card py-3">
      <div className="label">{label}</div>
      <div className={`text-xl font-semibold ${good ? "text-emerald-700" : ""}`}>{value}</div>
    </div>
  );
}

function AttentionList({ title, tone, items }: { title: string; tone: "amber" | "red"; items: { id: number; name: string; detail: string }[] }) {
  const toneCls = tone === "amber" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50";
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <ul className="flex flex-wrap gap-2">
        {items.slice(0, 12).map((i) => (
          <li key={i.id}>
            <Link href={`/outreach/${i.id}`} className="badge bg-white text-slate-700 hover:text-brand-700">
              {i.name} <span className="ml-1 text-slate-400">{i.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function BoardView({ f }: { f: ProspectFilters }) {
  const prospects = await prisma.prospect.findMany({
    where: prospectWhere({ ...f, status: undefined }),
    orderBy: [{ lastActivityAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: { clients: { select: { id: true } } },
  });
  return (
    <>
      <FilterBar view="board" f={f} showStatus={false} />
      {prospects.length === 0 ? (
        <EmptyState />
      ) : (
        <Board
          cards={prospects.map((p) => ({
            id: p.id,
            businessName: p.businessName,
            niche: p.niche,
            city: p.city,
            province: p.province,
            status: p.status,
            followUpDue: isFollowUpDue(p),
            stale: isStale(p),
            hasClient: p.clients.length > 0,
            doNotContact: p.doNotContact,
          }))}
        />
      )}
    </>
  );
}

const COLUMNS: [string, string][] = [
  ["businessName", "Business"],
  ["niche", "Niche"],
  ["city", "City"],
  ["province", "Prov"],
  ["status", "Status"],
  ["googleRating", "Rating"],
  ["reviewCount", "Reviews"],
  ["firstContactedAt", "First contact"],
  ["followUpDueAt", "Follow-up due"],
  ["lastActivityAt", "Last activity"],
];

async function TableView({ f }: { f: ProspectFilters }) {
  const prospects = await prisma.prospect.findMany({ where: prospectWhere(f), orderBy: prospectOrderBy(f) });
  return (
    <>
      <FilterBar view="table" f={f} />
      <div className="mb-2 text-sm text-slate-500">{prospects.length} prospects</div>
      {prospects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                {COLUMNS.map(([key, label]) => {
                  const active = f.sort === key;
                  const nextDir = active && f.dir === "asc" ? "desc" : "asc";
                  return (
                    <th key={key} className="whitespace-nowrap">
                      <Link href={`/outreach${filterQuery(f, { view: "table", sort: key, dir: nextDir })}`} className="hover:text-slate-900">
                        {label} {active ? (f.dir === "asc" ? "↑" : "↓") : ""}
                      </Link>
                    </th>
                  );
                })}
                <th>Ads (G/M)</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="font-medium">
                    <Link href={`/outreach/${p.id}`} className="hover:text-brand-700">{p.businessName}</Link>
                    {p.doNotContact && <span className="badge ml-2 bg-red-50 text-red-700">DNC</span>}
                  </td>
                  <td>{p.niche}</td>
                  <td>{p.city}</td>
                  <td>{p.province}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{p.googleRating ?? ""}</td>
                  <td>{p.reviewCount ?? ""}</td>
                  <td className="whitespace-nowrap">{formatDate(p.firstContactedAt)}</td>
                  <td className={`whitespace-nowrap ${isFollowUpDue(p) ? "font-medium text-amber-700" : ""}`}>{formatDate(p.followUpDueAt)}</td>
                  <td className="whitespace-nowrap">{formatDate(p.lastActivityAt)}</td>
                  <td className="whitespace-nowrap text-xs">{p.runningGoogleAds} / {p.runningMetaAds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="card text-sm text-slate-500">
      No prospects match. <Link href="/outreach/new" className="text-brand-700">Add one</Link> or{" "}
      <Link href="/outreach/import" className="text-brand-700">import a CSV</Link>.
    </div>
  );
}

function StatsView({ stats }: { stats: Awaited<ReturnType<typeof getOutreachStats>> }) {
  const f = stats.funnel;
  const steps: [string, number, string][] = [
    ["Contacted", f.contacted, ""],
    ["Replied", f.replied, rate(f.replied, f.contacted)],
    ["Audit booked", f.audits, rate(f.audits, f.replied)],
    ["Proposal", f.proposals, rate(f.proposals, f.audits)],
    ["Client", f.clients, rate(f.clients, f.proposals)],
  ];
  const max = Math.max(1, f.contacted);
  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <div className="label">Reply rate</div>
          <div className="text-2xl font-semibold">{pct(stats.replyRate)}</div>
        </div>
        <div className="card">
          <div className="label">Contacts per client</div>
          <div className="text-2xl font-semibold">{stats.contactsPerClient === null ? "n/a" : Math.round(stats.contactsPerClient)}</div>
          <div className="text-xs text-slate-500">Benchmark: 1 client per 50 to 100 contacts</div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Funnel</h2>
        <ul className="grid gap-2">
          {steps.map(([label, n, conv]) => (
            <li key={label} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 text-sm">
              <span>{label}</span>
              <span className="h-6 overflow-hidden rounded bg-slate-100">
                <span className="block h-6 rounded bg-brand-500" style={{ width: `${Math.min(100, (n / max) * 100)}%`, minWidth: n ? 4 : 0 }} />
              </span>
              <span className="text-right tabular-nums">
                {n}
                {conv && <span className="block text-xs text-slate-500">{conv}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Percentages are conversion from the step above.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title="By niche" rows={stats.byNiche} />
        <Breakdown title="By province" rows={stats.byProvince} />
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: GroupRow[] }) {
  return (
    <section className="card overflow-x-auto p-0">
      <h2 className="px-4 pt-4 font-semibold">{title}</h2>
      <table className="table mt-2">
        <thead>
          <tr>
            <th></th>
            <th>Prospects</th>
            <th>Contacted</th>
            <th>Reply rate</th>
            <th>Audits</th>
            <th>Clients</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} className="text-slate-400">No data yet.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="font-medium">{r.key}</td>
              <td>{r.total}</td>
              <td>{r.contacted}</td>
              <td>{rate(r.replied, r.contacted)}</td>
              <td>{r.audits}</td>
              <td>{r.clients}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

async function TemplatesView() {
  const [templates, sender] = await Promise.all([
    prisma.emailTemplate.findMany({ orderBy: { id: "asc" } }),
    prisma.goalSettings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  const signature = signatureBlock(sender);
  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-500">
        Your signature and opt-out line are added to every email (CASL). Change them in{" "}
        <Link href="/settings" className="text-brand-700">Settings</Link>. Follow-up templates can be sent once per prospect.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((t) => (
          <TemplateEditor key={t.id} template={t} signature={signature} />
        ))}
      </div>
      <h2 className="mt-2 font-semibold">New template</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <TemplateEditor key={`new-${templates.length}`} signature={signature} />
      </div>
    </div>
  );
}
