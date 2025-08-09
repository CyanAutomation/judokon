import { glob } from "glob";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const schemaFiles = await glob("src/schemas/*.schema.json", { cwd: rootDir });
if (!schemaFiles.includes("src/schemas/tooltips.schema.json")) {
  schemaFiles.push("src/schemas/tooltips.schema.json");
}
if (!schemaFiles.includes("src/schemas/statNames.schema.json")) {
  schemaFiles.push("src/schemas/statNames.schema.json");
}

let hasErrors = false;
for (const schemaPath of schemaFiles) {
  const baseName = path.basename(schemaPath, ".schema.json");
  const dataPath = path.join("src", "data", `${baseName}.json`);
  if (!existsSync(path.join(rootDir, dataPath))) {
    continue;
  }
  await new Promise((resolve) => {
    const child = spawn(
      "npx",
      [
        "ajv",
        "validate",
        "-s",
        schemaPath,
        "-d",
        dataPath,
        "-r",
        "src/schemas/commonDefinitions.schema.json"
      ],
      {
        cwd: rootDir,
        stdio: "inherit"
      }
    );
    child.on("exit", (code) => {
      if (code !== 0) {
        hasErrors = true;
      }
      resolve();
    });
  });
}

try {
  const mappingRaw = await readFile(path.join(rootDir, "src/data/countryCodeMapping.json"), "utf8");
  const mapping = JSON.parse(mappingRaw);
  const seen = new Set();
  for (const [code, entry] of Object.entries(mapping)) {
    if (!/^[a-z]{2}$/.test(code)) {
      console.error(`Invalid country code key: "${code}". Expected two-letter lowercase ISO code.`);
      hasErrors = true;
      continue;
    }
    if (seen.has(code)) {
      console.error(`Duplicate country code detected: "${code}"`);
      hasErrors = true;
    } else {
      seen.add(code);
    }
    if (entry.code !== code) {
      console.error(`Code mismatch for key "${code}": entry.code is "${entry.code}"`);
      hasErrors = true;
    }
  }
} catch (error) {
  console.error("Failed to validate countryCodeMapping.json:", error);
  hasErrors = true;
}

if (hasErrors) {
  process.exitCode = 1;
}
