import type { Prisma } from "@prisma/client";

export type ProspectFilters = {
  q?: string;
  niche?: string;
  province?: string;
  city?: string;
  status?: string;
  gads?: string; // running Google ads: yes | no | unknown
  mads?: string; // running Meta ads
  sort?: string;
  dir?: "asc" | "desc";
};

export const SORTABLE = [
  "businessName", "niche", "city", "province", "status", "googleRating", "reviewCount",
  "firstContactedAt", "followUpDueAt", "lastActivityAt", "createdAt",
] as const;

type Params = Record<string, string | string[] | undefined>;

export function parseFilters(params: Params | URLSearchParams): ProspectFilters {
  const get = (k: string) => {
    const v = params instanceof URLSearchParams ? params.get(k) : params[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : undefined;
  };
  return {
    q: get("q"),
    niche: get("niche"),
    province: get("province"),
    city: get("city"),
    status: get("status"),
    gads: get("gads"),
    mads: get("mads"),
    sort: get("sort"),
    dir: get("dir") === "desc" ? "desc" : "asc",
  };
}

export function prospectWhere(f: ProspectFilters): Prisma.ProspectWhereInput {
  const where: Prisma.ProspectWhereInput = {};
  if (f.niche) where.niche = f.niche;
  if (f.province) where.province = f.province;
  if (f.city) where.city = { contains: f.city };
  if (f.status) where.status = f.status;
  if (f.gads) where.runningGoogleAds = f.gads;
  if (f.mads) where.runningMetaAds = f.mads;
  if (f.q) {
    where.OR = [
      { businessName: { contains: f.q } },
      { contactName: { contains: f.q } },
      { email: { contains: f.q } },
      { notes: { contains: f.q } },
    ];
  }
  return where;
}

export function prospectOrderBy(f: ProspectFilters): Prisma.ProspectOrderByWithRelationInput[] {
  const key = (SORTABLE as readonly string[]).includes(f.sort ?? "") ? f.sort! : "createdAt";
  const dir = f.sort ? f.dir ?? "asc" : "desc";
  const nullable = ["googleRating", "reviewCount", "firstContactedAt", "followUpDueAt", "lastActivityAt"].includes(key);
  return [{ [key]: nullable ? { sort: dir, nulls: "last" } : dir }, { id: "asc" }];
}

/** Query string for the given filters, with overrides. Empty values are dropped. */
export function filterQuery(f: ProspectFilters, overrides: Record<string, string | undefined> = {}): string {
  const merged: Record<string, string | undefined> = { ...f, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}
