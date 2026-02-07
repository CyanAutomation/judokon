import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const skillsRoot = path.resolve(".github/skills");
const requiredHeadings = [
  "## Inputs / Outputs / Non-goals",
  "## Trigger conditions",
  "## Mandatory rules",
  "## Validation checklist",
  "## Expected output format",
  "## Failure/stop conditions"
];

async function findSkillFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSkillFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const skillFiles = await findSkillFiles(skillsRoot);

  if (skillFiles.length === 0) {
    console.log("No SKILL.md files found.");
    return;
  }

  const failures = [];

  for (const file of skillFiles) {
    const content = await readFile(file, "utf8");
    const missing = requiredHeadings.filter((heading) => {
      const regex = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      return !regex.test(content);
    });

    if (missing.length > 0) {
      failures.push({ file, missing });
    }
  }

  if (failures.length > 0) {
    console.error("Skill validation failed. Missing headings:\n");
    for (const failure of failures) {
      const relativePath = path.relative(process.cwd(), failure.file);
      console.error(`- ${relativePath}`);
      for (const heading of failure.missing) {
        console.error(`  - ${heading}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${skillFiles.length} SKILL.md files.`);
}

main().catch((error) => {
  console.error("Skill validation script failed:", error);
  process.exitCode = 1;
});
