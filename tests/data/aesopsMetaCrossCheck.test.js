// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../src/data");

async function loadJson(name) {
  const file = path.join(dataDir, name);
  return JSON.parse(await readFile(file, "utf8"));
}

describe("aesopsMeta cross-file consistency", () => {
  it("each meta id exists in aesopsFables.json", async () => {
    const [fables, meta] = await Promise.all([
      loadJson("aesopsFables.json"),
      loadJson("aesopsMeta.json")
    ]);
    const fableIds = new Set(fables.map((f) => f.id));
    for (const entry of meta) {
      expect(fableIds.has(entry.id)).toBe(true);
    }
  });
});
