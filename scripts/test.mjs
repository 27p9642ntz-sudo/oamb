// Runs the test suite against a throwaway database (prisma/test.db), never dev.db.
import { rmSync } from "node:fs";
import { execSync } from "node:child_process";

const env = { ...process.env, DATABASE_URL: "file:./test.db" };
for (const f of ["prisma/test.db", "prisma/test.db-journal"]) rmSync(f, { force: true });
execSync("npx prisma db push --skip-generate", { stdio: ["ignore", "ignore", "inherit"], env });
execSync("npx tsx --test tests/*.test.ts", { stdio: "inherit", env });
