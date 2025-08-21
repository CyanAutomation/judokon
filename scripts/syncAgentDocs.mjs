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

async function sync() {
  const content = await readFile(sourcePath, "utf8");
  await Promise.all(targets.map((target) => writeFile(target, content)));
}

sync();
