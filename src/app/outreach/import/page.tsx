import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Importer } from "@/components/outreach/Importer";

export default function ImportPage() {
  return (
    <>
      <Link href="/outreach" className="text-sm text-slate-500 hover:text-slate-800">← Outreach</Link>
      <PageHeader title="Import prospects" subtitle="Upload a CSV, match its columns to prospect fields, then import." />
      <Importer />
    </>
  );
}
