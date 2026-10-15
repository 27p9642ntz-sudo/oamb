import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await prisma.goalSettings.findUniqueOrThrow({ where: { id: 1 } });
  return (
    <>
      <PageHeader title="Settings" subtitle="Goal settings and the sender details used in every email signature" />
      <form action={saveSettings} className="grid gap-6 lg:grid-cols-2">
        <section className="card grid gap-4">
          <h2 className="font-semibold">Goal</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="goal">Goal (CA$)</label>
              <input className="input" id="goal" name="goal" inputMode="decimal" defaultValue={s.goalCents / 100} />
            </div>
            <div>
              <label className="label" htmlFor="monthlyFromPay">From pay per month (CA$)</label>
              <input className="input" id="monthlyFromPay" name="monthlyFromPay" inputMode="decimal" defaultValue={s.monthlyFromPayCents / 100} />
            </div>
            <div>
              <label className="label" htmlFor="startDate">Start date</label>
              <input className="input" id="startDate" name="startDate" type="date" defaultValue={toDateInput(s.startDate)} />
            </div>
            <div>
              <label className="label" htmlFor="targetMonthIndex">Target month</label>
              <input className="input" id="targetMonthIndex" name="targetMonthIndex" type="number" min={1} max={24} defaultValue={s.targetMonthIndex} />
            </div>
          </div>
        </section>
        <section className="card grid gap-4">
          <h2 className="font-semibold">Email signature (CASL)</h2>
          <p className="-mt-2 text-sm text-slate-500">Commercial emails must identify the sender and offer a way to opt out.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ownerName">Name</label>
              <input className="input" id="ownerName" name="ownerName" defaultValue={s.ownerName} />
            </div>
            <div>
              <label className="label" htmlFor="ownerEmail">Email</label>
              <input className="input" id="ownerEmail" name="ownerEmail" type="email" defaultValue={s.ownerEmail} />
            </div>
            <div>
              <label className="label" htmlFor="ownerPhone">Phone</label>
              <input className="input" id="ownerPhone" name="ownerPhone" type="tel" defaultValue={s.ownerPhone} />
            </div>
            <div>
              <label className="label" htmlFor="ownerWebsite">Website</label>
              <input className="input" id="ownerWebsite" name="ownerWebsite" defaultValue={s.ownerWebsite} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="unsubscribeLine">Opt-out line</label>
            <input className="input" id="unsubscribeLine" name="unsubscribeLine" defaultValue={s.unsubscribeLine} />
          </div>
        </section>
        <div className="lg:col-span-2">
          <button className="btn" type="submit">Save settings</button>
        </div>
      </form>
    </>
  );
}
