// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { getAjv } from "../../src/helpers/dataUtils.js";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../src/data");
const schemaDir = path.resolve(__dirname, "../../src/schemas");

const pairs = [
  ["countryCodeMapping.json", "countryCodeMapping.schema.json"],
  ["gameModes.json", "gameModes.schema.json"],
  ["gokyo.json", "gokyo.schema.json"],
  ["judoka.json", "judoka.schema.json"],
  ["weightCategories.json", "weightCategories.schema.json"],
  ["aesopsFables.json", "aesopsFables.schema.json"],
  ["aesopsMeta.json", "aesopsMeta.schema.json"],
  ["gameTimers.js", "gameTimers.schema.json"],
  ["navigationItems.js", "navigationItems.schema.json"],
  ["japaneseConverter.js", "japaneseConverter.schema.json"],
  ["locations.json", "locations.schema.json"],
  ["settings.json", "settings.schema.json"]
];

// Load Ajv and all data/schema files up front
const ajv = await getAjv();
const commonDefs = JSON.parse(
  await readFile(path.join(schemaDir, "commonDefinitions.schema.json"), "utf8")
);
ajv.addSchema(commonDefs);

const datasets = await Promise.all(
  pairs.map(async ([dataFile, schemaFile]) => {
    const dataPath = path.join(dataDir, dataFile);
    const dataPromise = dataFile.endsWith(".js")
      ? import(pathToFileURL(dataPath)).then((m) => m.default)
      : readFile(dataPath, "utf8").then(JSON.parse);
    const schemaPromise = readFile(path.join(schemaDir, schemaFile), "utf8").then(JSON.parse);
    const [data, schema] = await Promise.all([dataPromise, schemaPromise]);
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
          // Avoid raw console noise; surface details via thrown error
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

import statNames from "../../src/data/statNames.js";

describe("statNames.js integrity", () => {
  it("is sorted by statIndex with indexes 1-5", () => {
    expect(statNames.length).toBe(5);
    const indexes = statNames.map((e) => e.statIndex);
    const sorted = [...indexes].sort((a, b) => a - b);
    expect(indexes).toEqual(sorted);
    expect(indexes).toEqual([1, 2, 3, 4, 5]);
  });
});
