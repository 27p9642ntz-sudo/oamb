"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { parseCSV } from "@/lib/csv";
import { PROSPECT_FIELDS, guessMapping, type ProspectFieldKey } from "@/lib/prospectFields";
import { importProspects, type ImportRow } from "@/app/outreach/actions";

const FIELDS = PROSPECT_FIELDS.filter((f) => f.importable);

export function Importer() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ProspectFieldKey, number>>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof importProspects>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const headers = rows[0] ?? [];
  const body = rows.slice(1);
  const mapped: ImportRow[] = useMemo(
    () =>
      body.map((r) => {
        const out: ImportRow = {};
        for (const [k, idx] of Object.entries(mapping)) if (idx !== undefined && idx >= 0) out[k as ProspectFieldKey] = r[idx] ?? "";
        return out;
      }),
    [body, mapping],
  );

  async function onFile(file: File) {
    setResult(null);
    setError(null);
    setFileName(file.name);
    const parsed = parseCSV(await file.text());
    if (parsed.length < 2) {
      setError("That file has no data rows.");
      setRows([]);
      return;
    }
    setRows(parsed);
    setMapping(guessMapping(parsed[0]));
  }

  const previewFields = FIELDS.filter((f) => mapping[f.key] !== undefined && mapping[f.key]! >= 0);

  return (
    <div className="grid gap-6">
      <section className="card">
        <label className="label" htmlFor="file">1. Choose a CSV file</label>
        <input id="file" type="file" accept=".csv,text/csv" className="text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {fileName && rows.length > 0 && <p className="mt-2 text-sm text-slate-500">{fileName}: {body.length} rows, {headers.length} columns.</p>}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </section>

      {rows.length > 0 && (
        <>
          <section className="card">
            <h2 className="label">2. Match columns</h2>
            <p className="mb-3 text-sm text-slate-500">Matches were guessed from your headers. Business name is required. Rows that duplicate an existing email or business in the same city are skipped.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={`map-${f.key}`}>{f.label}{f.key === "businessName" ? " *" : ""}</label>
                  <select
                    id={`map-${f.key}`}
                    className="input"
                    value={mapping[f.key] ?? -1}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                  >
                    <option value={-1}>Skip</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="card overflow-x-auto">
            <h2 className="label">3. Preview (first 5 rows)</h2>
            <table className="table">
              <thead><tr>{previewFields.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
              <tbody>
                {mapped.slice(0, 5).map((r, i) => (
                  <tr key={i}>{previewFields.map((f) => <td key={f.key} className="max-w-48 truncate">{r[f.key]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="btn"
              disabled={pending || mapping.businessName === undefined || mapping.businessName < 0}
              onClick={() => start(async () => setResult(await importProspects(mapped)))}
            >
              Import {body.length} rows
            </button>
            {(mapping.businessName === undefined || mapping.businessName < 0) && <span className="text-sm text-red-700">Choose the Business name column.</span>}
          </div>
        </>
      )}

      {result && (
        <section className="card">
          <p className="font-medium text-emerald-700">Imported {result.created} prospects.</p>
          {result.skipped.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-slate-600">Skipped {result.skipped.length} rows</summary>
              <ul className="mt-2 list-disc pl-5 text-slate-500">
                {result.skipped.map((s) => <li key={s.row}>Row {s.row}: {s.reason}</li>)}
              </ul>
            </details>
          )}
          <Link href="/outreach?view=table" className="btn-secondary mt-3">View prospects</Link>
        </section>
      )}
    </div>
  );
}
