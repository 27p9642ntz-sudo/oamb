const styles: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  Contacted: "bg-sky-50 text-sky-700",
  "Follow-up sent": "bg-indigo-50 text-indigo-700",
  Replied: "bg-violet-50 text-violet-700",
  "Audit booked": "bg-amber-50 text-amber-700",
  "Audit done": "bg-amber-100 text-amber-800",
  "Proposal sent": "bg-orange-50 text-orange-700",
  Pilot: "bg-emerald-50 text-emerald-700",
  "Paying client": "bg-emerald-100 text-emerald-800",
  Lost: "bg-slate-100 text-slate-500",
  "Do not contact": "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge whitespace-nowrap ${styles[status] ?? "bg-slate-100"}`}>{status}</span>;
}
