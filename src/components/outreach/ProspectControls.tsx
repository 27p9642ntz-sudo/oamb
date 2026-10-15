"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { PIPELINE_STAGES } from "@/lib/constants";
import {
  createClientAction,
  deleteProspect,
  logActivityAction,
  noThanksAction,
  setStatus,
  type ActionResult,
} from "@/app/outreach/actions";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult | void>) =>
    start(async () => {
      const r = await fn();
      if (r) setResult(r);
      router.refresh();
    });
  return { pending, result, run };
}

function Result({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  return <div className={`text-sm ${r.ok ? "text-emerald-700" : "text-red-700"}`}>{r.ok ? r.message : r.error}</div>;
}

export function StatusControl({ id, status }: { id: number; status: string }) {
  const { pending, result, run } = useRun();
  return (
    <div className="grid gap-2">
      <label className="label" htmlFor="status">Pipeline stage</label>
      <select id="status" className="input" value={status} disabled={pending} onChange={(e) => run(() => setStatus(id, e.target.value))}>
        {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <Result r={result} />
    </div>
  );
}

export function NoThanksButton({ id }: { id: number }) {
  const { pending, result, run } = useRun();
  return (
    <div>
      <button
        type="button"
        className="btn-secondary w-full text-red-700"
        disabled={pending}
        onClick={() => confirm("Log a 'no thanks' reply and mark Do not contact? Emailing will be blocked.") && run(() => noThanksAction(id))}
      >
        They replied &quot;no thanks&quot;
      </button>
      <Result r={result} />
    </div>
  );
}

export function MarkLostButton({ id }: { id: number }) {
  const { pending, run } = useRun();
  return (
    <button type="button" className="btn bg-red-600 hover:bg-red-700" disabled={pending} onClick={() => run(() => setStatus(id, "Lost"))}>
      Mark Lost
    </button>
  );
}

export function CreateClientButton({ id }: { id: number }) {
  const { pending, result, run } = useRun();
  return (
    <div>
      <button type="button" className="btn w-full" disabled={pending} onClick={() => run(() => createClientAction(id))}>
        Create client workspace
      </button>
      <Result r={result} />
    </div>
  );
}

export function DeleteProspectButton({ id, name }: { id: number; name: string }) {
  return (
    <button
      type="button"
      className="text-xs text-red-700 hover:underline"
      onClick={() => confirm(`Delete ${name} and its activity log? This cannot be undone.`) && deleteProspect(id)}
    >
      Delete prospect
    </button>
  );
}

export function ActivityForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(logActivityAction.bind(null, id), null);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[9rem_1fr_auto]">
      <select name="type" className="input" defaultValue="note" aria-label="Activity type">
        <option value="note">Note</option>
        <option value="call">Call</option>
        <option value="reply">Reply</option>
        <option value="email">Email sent</option>
        <option value="follow-up">Follow-up sent</option>
      </select>
      <input name="note" className="input" placeholder="What happened?" aria-label="Activity note" />
      <button className="btn" disabled={pending}>Log</button>
      <div className="sm:col-span-3"><Result r={state} /></div>
    </form>
  );
}
