// Turns the raw dataset (markdown emails/notes + CRM CSV) into JSON the app imports.
// Runs automatically before `npm run dev` and `npm run build`.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rawDir = path.join(root, "data", "raw");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const sources = fs.readdirSync(rawDir).filter((f) => f.endsWith(".md")).sort().map((file) => {
  const text = fs.readFileSync(path.join(rawDir, file), "utf8");
  const title = (text.split("\n").find((l) => l.startsWith("#")) || file).replace(/^#+\s*/, "");
  const kind = /^#\s*(Email|Email Thread)/i.test(text.trim()) ? "email" : "note";
  return { file, date: file.slice(0, 10), title, kind, text };
});

const crm = parseCsv(fs.readFileSync(path.join(root, "data", "crm_export.csv"), "utf8"));

fs.mkdirSync(path.join(root, "data", "generated"), { recursive: true });
fs.writeFileSync(path.join(root, "data", "generated", "sources.json"), JSON.stringify(sources, null, 1));
fs.writeFileSync(path.join(root, "data", "generated", "crm.json"), JSON.stringify(crm, null, 1));
console.log(`data: ${sources.length} source files, ${crm.length} CRM records`);
