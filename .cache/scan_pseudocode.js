const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src", "helpers");

function walk(dir) {
  return fs.readdirSync(dir).flatMap((entry) => {
    const p = path.join(dir, entry);
    try {
      const s = fs.statSync(p);
      if (s.isDirectory()) return walk(p);
      if (s.isFile() && p.endsWith(".js")) return [p];
    } catch {
      return [];
    }
    return [];
  });
}

const files = walk(root);
const report = { files: files.length, missingTopJSDoc: [], missingPseudocode: [] };

for (const file of files) {
  const txt = fs.readFileSync(file, "utf8");
  const head = txt.slice(0, 400);
  const hasTopJSDoc = /^\s*\/\*\*/.test(head);
  const hasPseudo = /@pseudocode/.test(txt);
  if (!hasTopJSDoc) report.missingTopJSDoc.push(file.replace(process.cwd() + "/", ""));
  if (!hasPseudo) report.missingPseudocode.push(file.replace(process.cwd() + "/", ""));
}

console.log(JSON.stringify(report, null, 2));
