import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ProspectForm } from "@/components/outreach/ProspectForm";
import { createProspect } from "../actions";

export default function NewProspectPage() {
  return (
    <>
      <Link href="/outreach" className="text-sm text-slate-500 hover:text-slate-800">← Outreach</Link>
      <PageHeader title="Add prospect" />
      <ProspectForm action={createProspect} />
    </>
  );
}
