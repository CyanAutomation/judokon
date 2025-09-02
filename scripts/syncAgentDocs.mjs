import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "AGENTS.md");
const targets = [
  path.join(repoRoot, "GEMINI.md"),
  path.join(repoRoot, ".github", "copilot-instructions.md")
];

async function main() {
  try {
    const content = await readFile(sourcePath, "utf8");
    await Promise.all(targets.map((target) => writeFile(target, content)));
    const list = targets.map((t) => `updated: ${path.relative(repoRoot, t)}`).join("\n");
    console.log("Agent docs sync complete:\n" + list);
  } catch (err) {
    console.error("Agent docs sync failed:", err);
    process.exit(1);
  }
}

main();
