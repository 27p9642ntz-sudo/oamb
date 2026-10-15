import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, toDateInput } from "@/lib/dates";
import { buildEmail, isFollowUpDue, isStale } from "@/lib/prospects";
import { PageHeader } from "@/components/PageHeader";
import { EmailComposer, type Draft } from "@/components/outreach/EmailComposer";
import { ProspectForm } from "@/components/outreach/ProspectForm";
import {
  ActivityForm,
  CreateClientButton,
  DeleteProspectButton,
  MarkLostButton,
  NoThanksButton,
  StatusControl,
} from "@/components/outreach/ProspectControls";
import { StatusBadge } from "@/components/outreach/StatusBadge";
import { updateProspect } from "../actions";

export const dynamic = "force-dynamic";

const ACTIVITY_LABEL: Record<string, string> = {
  email: "Email sent",
  "follow-up": "Follow-up sent",
  reply: "Reply",
  call: "Call",
  note: "Note",
  status: "Stage",
};

function prospectLinks(p: { businessName: string; city: string; province: string; website: string; instagram: string }) {
  const place = [p.businessName, p.city, p.province].filter(Boolean).join(" ");
  const domain = p.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const links: [string, string][] = [
    ["Google Maps", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`],
    ["Meta Ad Library", `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=CA&search_type=keyword_unordered&q=${encodeURIComponent(p.businessName)}`],
    ["Google Ads Transparency", domain ? `https://adstransparency.google.com/?region=CA&domain=${encodeURIComponent(domain)}` : "https://adstransparency.google.com/?region=CA"],
  ];
  if (p.website) links.push(["Website", /^https?:\/\//.test(p.website) ? p.website : `https://${p.website}`]);
  if (p.instagram) links.push(["Instagram", `https://www.instagram.com/${p.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`]);
  return links;
}

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const p = await prisma.prospect.findUnique({
    where: { id },
    include: { activities: { orderBy: { date: "desc" } }, clients: { select: { id: true } } },
  });
  if (!p) notFound();

  const templates = await prisma.emailTemplate.findMany({ orderBy: { id: "asc" } });
  const drafts: Draft[] = await Promise.all(
    templates.map(async (t) => {
      const e = await buildEmail(p.id, t.id);
      return { templateId: t.id, name: t.name, kind: t.kind, subject: e.subject, body: e.body, missing: e.missing, blocked: e.check.ok ? null : e.check.reason };
    }),
  );
  const suggested = templates.find((t) => t.kind === (p.status === "New" ? "initial" : "follow-up"))?.id;
  const blocked = p.doNotContact || p.status === "Do not contact";
  const canCreateClient = (p.status === "Pilot" || p.status === "Paying client") && p.clients.length === 0;

  return (
    <>
      <Link href="/outreach" className="text-sm text-slate-500 hover:text-slate-800">← Outreach</Link>
      <PageHeader
        title={p.businessName}
        subtitle={[p.niche, [p.city, p.province].filter(Boolean).join(", "), p.contactName && `${p.contactName}${p.role ? ` (${p.role})` : ""}`].filter(Boolean).join(" · ")}
        actions={<StatusBadge status={p.status} />}
      />

      {isStale(p) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
          <span>Follow-up sent {formatDate(p.followUpSentAt)} with no reply in 7 days. Mark this prospect Lost?</span>
          <MarkLostButton id={p.id} />
        </div>
      )}
      {isFollowUpDue(p) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          Follow-up due {formatDate(p.followUpDueAt)}. Use the follow-up template below.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="grid min-w-0 gap-6">
          <section className="card">
            <h2 className="mb-3 font-semibold">Email</h2>
            {blocked ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Marked Do not contact. Emailing this business is blocked.
              </div>
            ) : (
              <EmailComposer prospectId={p.id} email={p.email} drafts={drafts} suggestedId={suggested} />
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Activity</h2>
            <ActivityForm id={p.id} />
            <ol className="mt-4 grid gap-2">
              {p.activities.length === 0 && <li className="text-sm text-slate-400">Nothing logged yet.</li>}
              {p.activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="w-36 shrink-0 text-xs text-slate-500">{formatDateTime(a.date)}</span>
                  <span>
                    <span className="font-medium">{ACTIVITY_LABEL[a.type] ?? a.type}</span>
                    {a.note && <span className="text-slate-600">{a.type === "status" ? `: moved to ${a.note}` : `: ${a.note}`}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <section className="card grid gap-3">
            <StatusControl id={p.id} status={p.status} />
            {canCreateClient && <CreateClientButton id={p.id} />}
            {p.clients.length > 0 && (
              <Link href="/clients" className="btn-secondary">Open client workspace</Link>
            )}
            {!blocked && <NoThanksButton id={p.id} />}
          </section>
          <section className="card text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-slate-500">First contact</dt><dd>{formatDate(p.firstContactedAt) || "Not yet"}</dd>
              <dt className="text-slate-500">Follow-up due</dt><dd>{formatDate(p.followUpDueAt) || "None"}</dd>
              <dt className="text-slate-500">Follow-up sent</dt><dd>{formatDate(p.followUpSentAt) || "No"}</dd>
              <dt className="text-slate-500">Last activity</dt><dd>{formatDate(p.lastActivityAt) || "None"}</dd>
              <dt className="text-slate-500">Email</dt><dd className="break-all">{p.email || "None"}</dd>
              <dt className="text-slate-500">Phone</dt><dd>{p.phone ? <a className="text-brand-700" href={`tel:${p.phone}`}>{p.phone}</a> : "None"}</dd>
            </dl>
          </section>
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">Prospecting links</h2>
            <ul className="grid gap-1 text-sm">
              {prospectLinks(p).map(([label, href]) => (
                <li key={label}>
                  <a className="text-brand-700 hover:underline" href={href} target="_blank" rel="noreferrer">{label} ↗</a>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Details</h2>
        <ProspectForm key={`due-${toDateInput(p.followUpDueAt)}`} action={updateProspect.bind(null, p.id)} prospect={p} followUpDue={toDateInput(p.followUpDueAt)} />
        <div className="mt-3 text-right">
          <DeleteProspectButton id={p.id} name={p.businessName} />
        </div>
      </section>
    </>
  );
}
