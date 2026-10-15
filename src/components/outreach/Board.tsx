"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PIPELINE_STAGES } from "@/lib/constants";
import { createClientAction, setStatus } from "@/app/outreach/actions";

export type BoardCard = {
  id: number;
  businessName: string;
  niche: string;
  city: string;
  province: string;
  status: string;
  followUpDue: boolean;
  stale: boolean;
  hasClient: boolean;
  doNotContact: boolean;
};

export function Board({ cards }: { cards: BoardCard[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);

  function move(id: number, status: string) {
    setError(null);
    start(async () => {
      const res = await setStatus(id, status);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function createClient(id: number) {
    start(async () => {
      const res = await createClientAction(id);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className={`flex gap-3 overflow-x-auto pb-3 ${pending ? "opacity-70" : ""}`}>
        {PIPELINE_STAGES.map((stage) => {
          const list = cards.filter((c) => c.status === stage);
          return (
            <section
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => setOver((o) => (o === stage ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragId !== null) move(dragId, stage);
                setDragId(null);
              }}
              className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 ${
                over === stage ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-slate-100/70"
              }`}
            >
              <h3 className="flex items-center justify-between px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {stage}
                <span className="rounded-full bg-white px-2 py-0.5 text-slate-500">{list.length}</span>
              </h3>
              <ul className="flex min-h-16 flex-col gap-2">
                {list.map((c) => (
                  <li
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <Link href={`/outreach/${c.id}`} className="font-medium hover:text-brand-700">
                      {c.businessName}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {[c.niche, [c.city, c.province].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                    </div>
                    {(c.followUpDue || c.stale) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.followUpDue && <span className="badge bg-amber-100 text-amber-800">Follow-up due</span>}
                        {c.stale && <span className="badge bg-red-100 text-red-700">7 days, no reply</span>}
                      </div>
                    )}
                    <select
                      aria-label={`Move ${c.businessName}`}
                      className="input mt-2 py-1 text-xs"
                      value={c.status}
                      onChange={(e) => move(c.id, e.target.value)}
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    {(c.status === "Pilot" || c.status === "Paying client") &&
                      (c.hasClient ? (
                        <Link href="/clients" className="mt-2 block text-xs text-brand-700">Client workspace created</Link>
                      ) : (
                        <button type="button" className="btn mt-2 w-full py-1 text-xs" onClick={() => createClient(c.id)}>
                          Create client workspace
                        </button>
                      ))}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
