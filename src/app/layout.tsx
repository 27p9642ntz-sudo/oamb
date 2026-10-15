import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav, Sidebar } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Ads Command Center",
  description: "Goal tracking, to-dos, outreach CRM and client workspaces for an ads management business.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
