// Email template merge fields and CASL-compliant signature handling.

export const MERGE_FIELDS = ["first_name", "business", "city", "service", "specific_observation"] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];
export type MergeData = Partial<Record<MergeField, string>>;

export type Sender = {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerWebsite: string;
  unsubscribeLine: string;
};

export function fillTemplate(text: string, data: MergeData): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    const value = data[key as MergeField];
    return value && value.trim() ? value.trim() : match;
  });
}

/** Signature block appended to every outgoing email. Always includes an opt-out line. */
export function signatureBlock(sender: Sender): string {
  const contact = [sender.ownerEmail, sender.ownerPhone, sender.ownerWebsite].filter(Boolean).join(" | ");
  return [sender.ownerName, contact || "[add your email and phone in Settings]", "", sender.unsubscribeLine].join("\n");
}

export function composeEmail(body: string, data: MergeData, sender: Sender): string {
  return `${fillTemplate(body.trimEnd(), data)}\n\n${signatureBlock(sender)}`;
}

/** Fields still left as {{placeholders}} after filling. */
export function unfilledFields(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g), (m) => m[1])));
}
