import { glob } from "glob";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

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

if (hasErrors) {
  process.exitCode = 1;
}
