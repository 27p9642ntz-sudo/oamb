// Fails if an em dash (U+2014) appears in app source, seed data, or docs.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "prisma", "README.md"];
const exts = [".ts", ".tsx", ".css", ".md", ".prisma"];
const EM = String.fromCharCode(0x2014);
const hits = [];

function walk(path) {
  const st = statSync(path);
  if (st.isDirectory()) return readdirSync(path).forEach((f) => walk(join(path, f)));
  if (!exts.some((e) => path.endsWith(e))) return;
  readFileSync(path, "utf8").split("\n").forEach((line, i) => {
    if (line.includes(EM)) hits.push(`${path}:${i + 1}: ${line.trim()}`);
  });
}

roots.forEach((r) => { try { walk(r); } catch {} });
if (hits.length) {
  console.error(`Found ${hits.length} em dash(es):\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("No em dashes found.");
