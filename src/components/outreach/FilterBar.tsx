import { NICHES, PIPELINE_STAGES, PROVINCES } from "@/lib/constants";
import type { ProspectFilters } from "@/lib/prospectQuery";

const YNU = [
  ["", "Any"],
  ["yes", "Yes"],
  ["no", "No"],
  ["unknown", "Unknown"],
];

export function FilterBar({ view, f, showStatus = true }: { view: string; f: ProspectFilters; showStatus?: boolean }) {
  return (
    <form method="get" className="card mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      <input type="hidden" name="view" value={view} />
      {f.sort && <input type="hidden" name="sort" value={f.sort} />}
      {f.sort && <input type="hidden" name="dir" value={f.dir} />}
      <div className="col-span-2">
        <label className="label" htmlFor="q">Search</label>
        <input className="input" id="q" name="q" defaultValue={f.q} placeholder="Business, contact, email" />
      </div>
      <div>
        <label className="label" htmlFor="niche">Niche</label>
        <select className="input" id="niche" name="niche" defaultValue={f.niche ?? ""}>
          <option value="">All</option>
          {NICHES.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="province">Province</label>
        <select className="input" id="province" name="province" defaultValue={f.province ?? ""}>
          <option value="">All</option>
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="city">City</label>
        <input className="input" id="city" name="city" defaultValue={f.city} />
      </div>
      {showStatus ? (
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select className="input" id="status" name="status" defaultValue={f.status ?? ""}>
            <option value="">All</option>
            {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="gads">Google ads</label>
        <select className="input" id="gads" name="gads" defaultValue={f.gads ?? ""}>
          {YNU.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="mads">Meta ads</label>
        <select className="input" id="mads" name="mads" defaultValue={f.mads ?? ""}>
          {YNU.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-4 lg:col-span-8">
        <button className="btn" type="submit">Apply filters</button>
        <a className="btn-secondary" href={`/outreach?view=${view}`}>Clear</a>
      </div>
    </form>
  );
}
