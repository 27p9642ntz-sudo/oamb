// Prospect field metadata shared by the form, table, CSV import and export.

export type ProspectFieldKey =
  | "businessName" | "niche" | "contactName" | "role" | "email" | "phone" | "website" | "instagram"
  | "city" | "province" | "googleRating" | "reviewCount" | "runningGoogleAds" | "runningMetaAds"
  | "websiteQuality" | "opportunityNotes" | "source" | "status" | "firstContactedAt" | "followUpDueAt"
  | "lastActivityAt" | "doNotContact" | "notes";

export const PROSPECT_FIELDS: { key: ProspectFieldKey; label: string; importable: boolean; aliases: string[] }[] = [
  { key: "businessName", label: "Business name", importable: true, aliases: ["business", "company", "name", "business name", "title"] },
  { key: "niche", label: "Niche", importable: true, aliases: ["category", "industry", "type"] },
  { key: "contactName", label: "Contact name", importable: true, aliases: ["contact", "owner", "first name", "full name"] },
  { key: "role", label: "Role", importable: true, aliases: ["title", "position", "job title"] },
  { key: "email", label: "Email", importable: true, aliases: ["e-mail", "email address", "emails"] },
  { key: "phone", label: "Phone", importable: true, aliases: ["phone number", "telephone", "tel"] },
  { key: "website", label: "Website", importable: true, aliases: ["url", "site", "web"] },
  { key: "instagram", label: "Instagram", importable: true, aliases: ["ig", "instagram url"] },
  { key: "city", label: "City", importable: true, aliases: ["town", "municipality", "locality"] },
  { key: "province", label: "Province", importable: true, aliases: ["prov", "state", "region"] },
  { key: "googleRating", label: "Google rating", importable: true, aliases: ["rating", "stars", "google stars"] },
  { key: "reviewCount", label: "Review count", importable: true, aliases: ["reviews", "number of reviews", "review count", "reviews count"] },
  { key: "runningGoogleAds", label: "Running Google ads", importable: true, aliases: ["google ads"] },
  { key: "runningMetaAds", label: "Running Meta ads", importable: true, aliases: ["meta ads", "facebook ads"] },
  { key: "websiteQuality", label: "Website quality", importable: true, aliases: ["site quality"] },
  { key: "opportunityNotes", label: "Opportunity notes", importable: true, aliases: ["opportunity", "observation", "specific observation", "specific_observation"] },
  { key: "source", label: "Source", importable: true, aliases: ["lead source"] },
  { key: "status", label: "Status", importable: false, aliases: [] },
  { key: "firstContactedAt", label: "First contacted", importable: false, aliases: [] },
  { key: "followUpDueAt", label: "Follow-up due", importable: false, aliases: [] },
  { key: "lastActivityAt", label: "Last activity", importable: false, aliases: [] },
  { key: "doNotContact", label: "Do not contact", importable: false, aliases: [] },
  { key: "notes", label: "Notes", importable: true, aliases: ["note", "comments"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Guess which CSV column feeds each prospect field. */
export function guessMapping(headers: string[]): Partial<Record<ProspectFieldKey, number>> {
  const mapping: Partial<Record<ProspectFieldKey, number>> = {};
  const used = new Set<number>();
  for (const f of PROSPECT_FIELDS.filter((f) => f.importable)) {
    const candidates = [f.label, f.key, ...f.aliases].map(norm);
    const idx = headers.findIndex((h, i) => !used.has(i) && candidates.includes(norm(h)));
    if (idx >= 0) {
      mapping[f.key] = idx;
      used.add(idx);
    }
  }
  return mapping;
}

const PROVINCE_NAMES: Record<string, string> = {
  alberta: "AB", "britishcolumbia": "BC", manitoba: "MB", "newbrunswick": "NB", "newfoundlandandlabrador": "NL",
  newfoundland: "NL", "novascotia": "NS", "northwestterritories": "NT", nunavut: "NU", ontario: "ON",
  "princeedwardisland": "PE", quebec: "QC", "québec": "QC", saskatchewan: "SK", yukon: "YT",
};

export function normalizeProvince(input: string): string {
  const s = input.trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  return PROVINCE_NAMES[norm(s.normalize("NFD").replace(/[̀-ͯ]/g, ""))] ?? s;
}

export function normalizeYesNo(input: string): "yes" | "no" | "unknown" {
  const s = input.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(s)) return "yes";
  if (["no", "n", "false", "0"].includes(s)) return "no";
  return "unknown";
}

export function normalizeQuality(input: string): "good" | "weak" | "none" {
  const s = input.trim().toLowerCase();
  if (s === "good" || s === "weak") return s;
  if (!s || s === "none" || s === "no") return "none";
  return "weak";
}
