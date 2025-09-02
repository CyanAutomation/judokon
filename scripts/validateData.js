import { glob } from "glob";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const schemaFiles = await glob("src/schemas/*.schema.json", { cwd: rootDir });
if (!schemaFiles.includes("src/schemas/tooltips.schema.json")) {
  schemaFiles.push("src/schemas/tooltips.schema.json");
}

let hasErrors = false;

// Initialize Ajv once
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Preload common definitions for $ref resolution
let commonDefs;
try {
  commonDefs = JSON.parse(
    await readFile(path.join(rootDir, "src/schemas/commonDefinitions.schema.json"), "utf8")
  );
  ajv.addSchema(commonDefs);
} catch (err) {
  console.error("Failed to load commonDefinitions.schema.json:", err);
  process.exitCode = 1;
}

for (const schemaPath of schemaFiles) {
  const baseName = path.basename(schemaPath, ".schema.json");
  const dataPath = path.join("src", "data", `${baseName}.json`);
  const absSchemaPath = path.join(rootDir, schemaPath);
  const absDataPath = path.join(rootDir, dataPath);

  if (!existsSync(absDataPath)) {
    continue;
  }

  try {
    const schema = JSON.parse(await readFile(absSchemaPath, "utf8"));
    const data = JSON.parse(await readFile(absDataPath, "utf8"));

    // Ensure schemas with $id can be referenced consistently
    if (schema && schema.$id) {
      ajv.removeSchema(schema.$id);
    }

    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      hasErrors = true;
      console.error(`Validation failed for ${dataPath}`);
      for (const err of validate.errors ?? []) {
        const instancePath = err.instancePath || "";
        console.error(` - ${instancePath} ${err.message}`);
      }
    }
  } catch (err) {
    hasErrors = true;
    console.error(`Error validating ${dataPath}:`, err);
  }
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
