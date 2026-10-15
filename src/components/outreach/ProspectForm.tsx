"use client";

import { useActionState } from "react";
import type { Prospect } from "@prisma/client";
import { NICHES, PROVINCES } from "@/lib/constants";
import type { ActionResult } from "@/app/outreach/actions";

type Action = (state: ActionResult | null, form: FormData) => Promise<ActionResult>;

function Field({ label, name, children, wide }: { label: string; name: string; children?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <label className="label" htmlFor={name}>{label}</label>
      {children}
    </div>
  );
}

export function ProspectForm({ action, prospect, followUpDue }: { action: Action; prospect?: Prospect; followUpDue?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const p = prospect;
  const text = (name: keyof Prospect, type = "text", placeholder?: string) => (
    <input className="input" id={name} name={name} type={type} placeholder={placeholder} defaultValue={(p?.[name] as string | number | null) ?? ""} />
  );
  const ynu = (name: "runningGoogleAds" | "runningMetaAds") => (
    <select className="input" id={name} name={name} defaultValue={p?.[name] ?? "unknown"}>
      <option value="unknown">Unknown</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );

  return (
    <form action={formAction} className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Business name *" name="businessName">
        <input className="input" id="businessName" name="businessName" required defaultValue={p?.businessName} />
      </Field>
      <Field label="Niche" name="niche">
        <select className="input" id="niche" name="niche" defaultValue={p?.niche ?? ""}>
          <option value="">Choose</option>
          {NICHES.map((n) => <option key={n}>{n}</option>)}
        </select>
      </Field>
      <Field label="Source" name="source">{text("source", "text", "Google Maps, referral, list")}</Field>
      <Field label="Contact name" name="contactName">{text("contactName")}</Field>
      <Field label="Role" name="role">{text("role", "text", "Owner")}</Field>
      <Field label="Email" name="email">{text("email", "email")}</Field>
      <Field label="Phone" name="phone">{text("phone", "tel")}</Field>
      <Field label="Website" name="website">{text("website", "text", "example.ca")}</Field>
      <Field label="Instagram" name="instagram">{text("instagram", "text", "@handle")}</Field>
      <Field label="City" name="city">{text("city")}</Field>
      <Field label="Province" name="province">
        <select className="input" id="province" name="province" defaultValue={p?.province ?? ""}>
          <option value="">Choose</option>
          {PROVINCES.map((v) => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Google rating" name="googleRating">{text("googleRating", "number")}</Field>
        <Field label="Reviews" name="reviewCount">{text("reviewCount", "number")}</Field>
      </div>
      <Field label="Running Google ads" name="runningGoogleAds">{ynu("runningGoogleAds")}</Field>
      <Field label="Running Meta ads" name="runningMetaAds">{ynu("runningMetaAds")}</Field>
      <Field label="Website quality" name="websiteQuality">
        <select className="input" id="websiteQuality" name="websiteQuality" defaultValue={p?.websiteQuality ?? "none"}>
          <option value="good">Good</option>
          <option value="weak">Weak</option>
          <option value="none">None</option>
        </select>
      </Field>
      <Field label="Opportunity (the specific thing for the email)" name="opportunityNotes" wide>
        <textarea
          className="input min-h-20"
          id="opportunityNotes"
          name="opportunityNotes"
          defaultValue={p?.opportunityNotes}
          placeholder="your 4.8 stars from 60 reviews aren't showing up in any ads for &quot;roofing Kamloops&quot;"
        />
        <p className="mt-1 text-xs text-slate-500">Fills {"{{specific_observation}}"} after &quot;I noticed&quot;. Write it lowercase, no ending period.</p>
      </Field>
      {p && (
        <Field label="Follow-up due" name="followUpDueAt">
          <input className="input" id="followUpDueAt" name="followUpDueAt" type="date" defaultValue={followUpDue} />
        </Field>
      )}
      <Field label="Notes" name="notes" wide>
        <textarea className="input min-h-20" id="notes" name="notes" defaultValue={p?.notes} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button className="btn" disabled={pending}>{p ? "Save changes" : "Add prospect"}</button>
        {state && <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.ok ? state.message : state.error}</span>}
      </div>
    </form>
  );
}
