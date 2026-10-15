import { prisma } from "@/lib/db";
import { formatDate, vanToday } from "@/lib/dates";
import { TASK_CATEGORIES } from "@/lib/constants";
import { ComingNext, PageHeader } from "@/components/PageHeader";
import { toggleTask } from "../actions";

export const dynamic = "force-dynamic";

const priorityStyle: Record<string, string> = {
  High: "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

export default async function TodosPage() {
  const tasks = await prisma.task.findMany({ orderBy: [{ done: "asc" }, { dueDate: "asc" }] });
  const today = vanToday();

  return (
    <>
      <PageHeader title="To-Dos" subtitle={`${tasks.filter((t) => !t.done).length} open tasks`} />
      <div className="grid gap-6 lg:grid-cols-2">
        {TASK_CATEGORIES.map((cat) => {
          const list = tasks.filter((t) => t.category === cat);
          return (
            <section key={cat}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{cat}</h2>
              {list.length === 0 ? (
                <p className="card text-sm text-slate-400">Nothing here yet.</p>
              ) : (
                <ul className="card divide-y divide-slate-100 p-0">
                  {list.map((t) => {
                    const overdue = !t.done && t.dueDate && t.dueDate < today;
                    return (
                      <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                        <form action={toggleTask.bind(null, t.id)}>
                          <button
                            type="submit"
                            aria-label={t.done ? "Mark not done" : "Mark done"}
                            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${
                              t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                            }`}
                          >
                            {t.done ? "✓" : ""}
                          </button>
                        </form>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm ${t.done ? "text-slate-400 line-through" : ""}`}>{t.title}</div>
                          <div className={`text-xs ${overdue ? "font-medium text-red-600" : "text-slate-500"}`}>
                            {t.dueDate ? `Due ${formatDate(t.dueDate)}` : "No due date"}
                            {overdue && " · Overdue"}
                          </div>
                          {t.notes && <div className="mt-1 text-xs text-slate-500">{t.notes}</div>}
                        </div>
                        <span className={`badge ${priorityStyle[t.priority] ?? ""}`}>{t.priority}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <div className="mt-6">
        <ComingNext phase={3}>Today, This week and Completed views, adding and editing tasks, recurring tasks and CRM-linked follow-ups.</ComingNext>
      </div>
    </>
  );
}
