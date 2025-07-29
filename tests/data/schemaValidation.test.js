// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { getAjv } from "../../src/helpers/dataUtils.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../src/data");
const schemaDir = path.resolve(__dirname, "../../src/schemas");

const pairs = [
  ["countryCodeMapping.json", "countryCodeMapping.schema.json"],
  ["gameModes.json", "gameModes.schema.json"],
  ["navigationItems.json", "navigationItems.schema.json"],
  ["gokyo.json", "gokyo.schema.json"],
  ["judoka.json", "judoka.schema.json"],
  ["weightCategories.json", "weightCategories.schema.json"],
  ["aesopsFables.json", "aesopsFables.schema.json"],
  ["aesopsMeta.json", "aesopsMeta.schema.json"],
  ["japaneseConverter.json", "japaneseConverter.schema.json"],
  ["locations.json", "locations.schema.json"],
  ["settings.json", "settings.schema.json"]
];

let ajv;
beforeAll(async () => {
  ajv = await getAjv();
  const commonDefs = JSON.parse(
    await readFile(path.join(schemaDir, "commonDefinitions.schema.json"), "utf8")
  );
  ajv.addSchema(commonDefs);
});

describe("data files conform to schemas", () => {
  for (const [dataFile, schemaFile] of pairs) {
    it(`${dataFile} matches ${schemaFile}`, async () => {
      const data = JSON.parse(await readFile(path.join(dataDir, dataFile), "utf8"));
      const schema = JSON.parse(await readFile(path.join(schemaDir, schemaFile), "utf8"));
      const validate = ajv.compile(schema);

      // Check that schema is valid before using it
      expect(typeof validate).toBe("function");

      // Test both array and object data
      const items = Array.isArray(data) && schema.type !== "array" ? data : [data];
      for (const item of items) {
        const valid = validate(item);
        if (!valid) {
          // Print detailed error for debugging
          // ajv.errorsText may be empty, so also log validate.errors
          // This helps with diagnosing schema/data mismatches
          console.error(validate.errors);
          throw new Error(ajv.errorsText(validate.errors) || JSON.stringify(validate.errors));
        }
        expect(valid).toBe(true);
      }
    });
  }

  it("fails validation for intentionally broken data", async () => {
    // Use a known-bad object for negative test
    const schema = JSON.parse(await readFile(path.join(schemaDir, "judoka.schema.json"), "utf8"));
    const ajv = await getAjv();
    const validate = ajv.compile(schema);
    const bad = { foo: "bar" };
    expect(validate(bad)).toBe(false);
  });
});
