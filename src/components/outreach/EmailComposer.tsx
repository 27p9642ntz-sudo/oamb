"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logSentAction } from "@/app/outreach/actions";

export type Draft = {
  templateId: number;
  name: string;
  kind: string;
  subject: string;
  body: string;
  missing: string[];
  blocked: string | null;
};

export function EmailComposer({ prospectId, email, drafts, suggestedId }: { prospectId: number; email: string; drafts: Draft[]; suggestedId?: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState(suggestedId ?? drafts[0]?.templateId);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const d = drafts.find((x) => x.templateId === selected);

  if (!d) return <p className="text-sm text-slate-500">No templates yet. Add one under Outreach, Templates.</p>;

  const problem = d.blocked ?? (d.missing.length ? `Fill in before sending: ${d.missing.join(", ")}. Edit the prospect below.` : null);

  function logSend(after?: () => void) {
    start(async () => {
      const res = await logSentAction(prospectId, d!.templateId);
      setMsg(res.ok ? { ok: true, text: res.message ?? "Logged." } : { ok: false, text: res.error });
      if (res.ok) {
        setCopied(false);
        after?.();
        router.refresh();
      }
    });
  }

  const mailto = `mailto:${email}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {drafts.map((x) => (
          <button
            key={x.templateId}
            type="button"
            onClick={() => {
              setSelected(x.templateId);
              setCopied(false);
              setMsg(null);
            }}
            className={`rounded-full border px-3 py-1 text-xs ${x.templateId === selected ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"}`}
          >
            {x.name}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 px-3 py-2 text-sm">
          <span className="text-slate-500">To: </span>{email || <em className="text-slate-400">no email</em>}
          <br />
          <span className="text-slate-500">Subject: </span>{d.subject}
        </div>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-3 font-sans text-sm text-slate-700">{d.body}</pre>
      </div>
      {problem ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{problem}</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" disabled={pending} onClick={() => logSend(() => (window.location.href = mailto))}>
            Open in mail app
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(`Subject: ${d.subject}\n\n${d.body}`);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
          {copied && (
            <button type="button" className="btn-secondary border-brand-500 text-brand-700" disabled={pending} onClick={() => logSend()}>
              I sent it, log it
            </button>
          )}
        </div>
      )}
      {msg && <div className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</div>}
    </div>
  );
}
