"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", short: "Goal", icon: "◎" },
  { href: "/todos", label: "To-Dos", short: "To-Dos", icon: "☑" },
  { href: "/outreach", label: "Outreach CRM", short: "Outreach", icon: "✉" },
  { href: "/clients", label: "Clients", short: "Clients", icon: "▦" },
  { href: "/settings", label: "Settings", short: "Settings", icon: "⚙" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="no-print hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="px-5 py-5">
        <div className="text-sm font-semibold text-slate-900">Ads Command Center</div>
        <div className="text-xs text-slate-500">Goal: CA$4,000</div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              isActive(pathname, l.href) ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span aria-hidden className="w-4 text-center">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
            isActive(pathname, l.href) ? "font-medium text-brand-700" : "text-slate-500"
          }`}
        >
          <span aria-hidden className="text-base leading-none">{l.icon}</span>
          {l.short}
        </Link>
      ))}
    </nav>
  );
}
