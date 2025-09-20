import fs from "fs";
import path from "path";
const prdIndex = JSON.parse(
  fs.readFileSync("design/productRequirementsDocuments/prdIndex.json", "utf8")
);
const normalize = (s) =>
  s
    .replace(/[-_. ]/g, "")
    .toLowerCase()
    .replace(/^prd/, "");
const mapping = [];
const docsDir = "docs";
const designDir = "design";
const walk = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
walk(docsDir).forEach((f) => {
  const name = normalize(f);
  const match = prdIndex.find((p) => normalize(p) === name);
  mapping.push({ source: path.posix.join(docsDir, f), mappedTo: match || null });
});
walk(designDir).forEach((f) => {
  const name = normalize(f);
  const match = prdIndex.find((p) => normalize(p) === name);
  mapping.push({ source: path.posix.join(designDir, f), mappedTo: match || null });
});
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/prd-mapping-report.json", JSON.stringify(mapping, null, 2));
fs.writeFileSync(
  "reports/prd-mapping-report.csv",
  mapping.map((m) => `"${m.source}","${m.mappedTo || ""}"`).join("\n")
);
console.log("Wrote reports/prd-mapping-report.json and .csv");
