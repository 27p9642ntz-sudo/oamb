"use client";

import { useActionState, useState } from "react";
import { MERGE_FIELDS } from "@/lib/templates";
import { deleteTemplate, saveTemplate, type ActionResult } from "@/app/outreach/actions";

type Template = { id: number; name: string; kind: string; subject: string; body: string };

export function TemplateEditor({ template, signature }: { template?: Template; signature: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveTemplate.bind(null, template?.id ?? null),
    null,
  );
  const [body, setBody] = useState(template?.body ?? "");

  return (
    <form action={action} className="card grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input className="input" name="name" defaultValue={template?.name} required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" name="kind" defaultValue={template?.kind ?? "initial"}>
            <option value="initial">initial</option>
            <option value="follow-up">follow-up</option>
            <option value="other">other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Subject</label>
        <input className="input" name="subject" defaultValue={template?.subject} required />
      </div>
      <div>
        <label className="label">Body</label>
        <textarea className="input min-h-40 font-mono text-xs" name="body" value={body} onChange={(e) => setBody(e.target.value)} required />
        <div className="mt-1 text-xs text-slate-500">
          Merge fields: {MERGE_FIELDS.map((f) => <code key={f} className="mr-1 rounded bg-slate-100 px-1">{`{{${f}}}`}</code>)}
        </div>
      </div>
      <div>
        <div className="label">Signature added automatically</div>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 font-sans text-xs text-slate-500">{signature}</pre>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" disabled={pending}>{template ? "Save" : "Add template"}</button>
        {template && (
          <button
            type="button"
            className="btn-secondary text-red-700"
            onClick={() => confirm(`Delete "${template.name}"?`) && deleteTemplate(template.id)}
          >
            Delete
          </button>
        )}
        {state && <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.ok ? state.message : state.error}</span>}
      </div>
    </form>
  );
}
