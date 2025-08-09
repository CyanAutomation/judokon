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
  ["settings.json", "settings.schema.json"],
  ["statNames.json", "statNames.schema.json"]
];

// Load Ajv and all data/schema files up front
const ajv = await getAjv();
const commonDefs = JSON.parse(
  await readFile(path.join(schemaDir, "commonDefinitions.schema.json"), "utf8")
);
ajv.addSchema(commonDefs);

const datasets = await Promise.all(
  pairs.map(async ([dataFile, schemaFile]) => {
    const [data, schema] = await Promise.all([
      readFile(path.join(dataDir, dataFile), "utf8").then(JSON.parse),
      readFile(path.join(schemaDir, schemaFile), "utf8").then(JSON.parse)
    ]);
    const validate = ajv.getSchema(schema.$id) || ajv.compile(schema);
    return { dataFile, schemaFile, data, schema, validate };
  })
);

describe("data files conform to schemas", () => {
  it.each(datasets)("$dataFile matches $schemaFile", async ({ data, schema, validate }) => {
    expect(typeof validate).toBe("function");

    const items = Array.isArray(data) && schema.type !== "array" ? data : [data];

    await Promise.all(
      items.map(async (item) => {
        const valid = validate(item);
        if (!valid) {
          console.error(validate.errors);
          throw new Error(ajv.errorsText(validate.errors) || JSON.stringify(validate.errors));
        }
        expect(valid).toBe(true);
      })
    );
  });

  it("fails validation for intentionally broken data", () => {
    const { validate } = datasets.find(({ schemaFile }) => schemaFile === "judoka.schema.json");
    const bad = { foo: "bar" };
    expect(validate(bad)).toBe(false);
  });
});

describe("statNames.json integrity", () => {
  it("is sorted by statIndex with indexes 1-5", () => {
    const { data } = datasets.find(({ dataFile }) => dataFile === "statNames.json");
    expect(data.length).toBe(5);
    const indexes = data.map((e) => e.statIndex);
    const sorted = [...indexes].sort((a, b) => a - b);
    expect(indexes).toEqual(sorted);
    expect(indexes).toEqual([1, 2, 3, 4, 5]);
  });
});
