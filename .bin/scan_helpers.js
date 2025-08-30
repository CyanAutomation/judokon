import fs from "fs";
import path from "path";
const dir = path.resolve("src/helpers");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
const result = { total: files.length, files: [] };
for (const f of files) {
  const p = path.join(dir, f);
  const s = fs.readFileSync(p, "utf8");
  const hasJSDoc = /\/\*\*[\s\S]*?\*\//.test(s);
  const hasPseudocode = /@pseudocode/.test(s);
  result.files.push({ file: f, hasJSDoc, hasPseudocode });
}
console.log(JSON.stringify(result, null, 2));
