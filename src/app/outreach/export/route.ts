import { prisma } from "@/lib/db";
import { toCSV } from "@/lib/csv";
import { toDateInput } from "@/lib/dates";
import { PROSPECT_FIELDS } from "@/lib/prospectFields";
import { parseFilters, prospectOrderBy, prospectWhere } from "@/lib/prospectQuery";

export const dynamic = "force-dynamic";

/** CSV export of the prospects matching the current filters. */
export async function GET(req: Request) {
  const f = parseFilters(new URL(req.url).searchParams);
  const prospects = await prisma.prospect.findMany({ where: prospectWhere(f), orderBy: prospectOrderBy(f) });
  const csv = toCSV(
    PROSPECT_FIELDS.map((c) => c.label),
    prospects.map((p) =>
      PROSPECT_FIELDS.map(({ key }) => {
        const v = p[key];
        if (v instanceof Date) return toDateInput(v);
        if (typeof v === "boolean") return v ? "yes" : "no";
        return v;
      }),
    ),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prospects-${toDateInput(new Date())}.csv"`,
    },
  });
}
