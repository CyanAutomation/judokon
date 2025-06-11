import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { getAjv } from "./src/helpers/dataUtils.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../src/data");
const schemaDir = path.resolve(__dirname, "../../src/schemas");

const pairs = [
  ["countryCodeMapping.json", "countryCodeMapping.schema.json"],
  ["gameModes.json", "gameModes.schema.json"],
  ["gokyo.json", "gokyo.schema.json"],
  ["judoka.json", "judoka.schema.json"],
  ["weightCategories.json", "weightCategories.schema.json"]
];

describe("data files conform to schemas", async () => {
  const ajv = await getAjv();
  for (const [dataFile, schemaFile] of pairs) {
    it(`${dataFile} matches ${schemaFile}`, async () => {
      const data = JSON.parse(await readFile(path.join(dataDir, dataFile), "utf8"));
      const schema = JSON.parse(await readFile(path.join(schemaDir, schemaFile), "utf8"));
      const validate = ajv.compile(schema);
      const items = Array.isArray(data) && schema.type !== "array" ? data : [data];
      for (const item of items) {
        const valid = validate(item);
        if (!valid) {
          throw new Error(ajv.errorsText(validate.errors));
        }
        expect(valid).toBe(true);
      }
    });
  }
});
