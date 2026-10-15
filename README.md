# Ads Business Command Center

Local web app for running a Google and Meta ads management business toward a CA$4,000 goal:
Goal Dashboard, To-Dos, Outreach CRM and Client Portal in one place.

Stack: Next.js (App Router), TypeScript, Tailwind CSS, SQLite with Prisma, Recharts.

## Run it

Needs Node.js 20 or newer.

```bash
npm install          # installs packages and generates the Prisma client
cp .env.example .env # points Prisma at prisma/dev.db
npm run setup        # creates the database and loads the seed data
npm run dev          # open http://localhost:3000
```

To open it on your phone, run `npm run dev -- -H 0.0.0.0` and visit `http://<your-laptop-ip>:3000`
on the same Wi-Fi.

First thing to do: open **Settings** and add your email and phone. They go into the signature
on every outreach email, along with the opt-out line (required by CASL).

## Outreach CRM

- **Pipeline** (drag cards between stages, or use the dropdown on a phone), **Table** (sort by any
  column header, filter by niche, province, city, status and whether they run ads), **Stats** and
  **Templates**.
- Sending: open a prospect, pick a template, then **Open in mail app** (logs the send and opens a
  pre-filled email) or **Copy to clipboard**, then **I sent it, log it**. Nothing is sent automatically.
- Sending the first email moves a prospect to Contacted, sets a follow-up due in 3 days and adds a
  follow-up task to To-Dos. Each prospect gets one follow-up only. If there is no reply 7 days after
  the follow-up, the CRM prompts you to mark it Lost.
- **They replied "no thanks"** marks the prospect Do not contact, and emailing them is then blocked.
- Moving a prospect to Pilot or Paying client shows **Create client workspace**, which copies their
  details into Clients along with the onboarding checklist.
- **Import CSV** guesses which column is which from the headers. You can change any match before
  importing. Rows that repeat an email you already have, or a business in the same city, are skipped.
  **Export CSV** exports whatever the current filters show.

## Data

- Everything lives in one file: `prisma/dev.db`. Back it up by copying that file somewhere safe.
- Money is stored in cents and shown as CA$. Dates are shown in America/Vancouver time.
- `npm run db:seed` only adds seed data that is missing, so it is safe to re-run.
- `npm run db:reset` wipes the database and re-seeds it. This deletes all your data.

A one-click JSON and CSV export is planned for phase 7.

## Checks

```bash
npm test              # CRM rules, against a throwaway prisma/test.db
npm run typecheck     # TypeScript
npm run check:dashes  # fails if an em dash appears in source or docs
npm run build         # production build
```

## Build progress

1. [x] Scaffold, database, seed data, navigation
2. [x] Outreach CRM
3. [ ] To-Dos with recurring tasks and CRM-linked follow-ups
4. [ ] Goal Dashboard: projection, scenario chart, outreach stats
5. [ ] Client Portal: overview, onboarding, invoices
6. [ ] Client Portal: campaigns, optimization log, metrics, reports, case studies
7. [ ] Backup export and final docs
