import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { collectTestStats, rollDice } from "../../scripts/collectTestStats.mjs";

describe("rollDice", () => {
  it("maps random values to judo throws", () => {
    const rollCases = [
      { value: 0, roll: 1, throwName: "Seoi Nage" },
      { value: 0.2, roll: 2, throwName: "Osoto Gari" },
      { value: 0.4, roll: 3, throwName: "Uchi Mata" },
      { value: 0.6, roll: 4, throwName: "Harai Goshi" },
      { value: 0.8, roll: 5, throwName: "Tai Otoshi" },
      { value: 0.99, roll: 6, throwName: "Kouchi Gari" }
    ];

    const results = rollCases.map(({ value }) => rollDice(() => value));

    results.forEach((result, index) => {
      const { roll, throwName } = rollCases[index];
      expect(result).toContain(`Roll: ${roll}`);
      expect(result).toContain(`*${throwName}*`);
    });
  });

  it("falls back to the first roll for malformed random values", () => {
    expect(rollDice(() => Number.NaN)).toBe(
      "🎲 Roll: 1 — *Seoi Nage* lightning strike! ⚡️ Shoulder throw supremacy."
    );
    expect(rollDice(() => Infinity)).toBe(
      "🎲 Roll: 1 — *Seoi Nage* lightning strike! ⚡️ Shoulder throw supremacy."
    );
    expect(rollDice(() => -1)).toBe(
      "🎲 Roll: 1 — *Seoi Nage* lightning strike! ⚡️ Shoulder throw supremacy."
    );
    expect(rollDice(() => 1.0)).toBe("🎲 Roll: 6 — *Kouchi Gari* trip! 🎯 Small but deadly.");
  });
});

describe("collectTestStats", () => {
  it("counts files, cases and updated snapshots", async () => {
    const root = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "fixtures",
      "collectTestStats"
    );
    const stats = await collectTestStats(root, () => "test-results/a.png\nnotes.md\n");
    expect(stats).toEqual({
      snapshots: 2,
      testfiles: 0,
      testcases: 0,
      updated: 1
    });
  });

  it("maps snapshots, test files, and updates in a realistic fixture tree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "collect-test-stats-"));

    try {
      await mkdir(path.join(root, "tests", "unit"), { recursive: true });
      await mkdir(path.join(root, "playwright", "e2e"), { recursive: true });
      await mkdir(path.join(root, "playwright", "utils"), { recursive: true });
      await mkdir(path.join(root, "test-results", "nested"), { recursive: true });

      await writeFile(
        path.join(root, "tests", "unit", "widget.test.js"),
        'test("counts", () => {});\nit("counts too", () => {});\n'
      );
      await writeFile(
        path.join(root, "tests", "unit", "helper.js"),
        "export const helper = true;\n"
      );
      await writeFile(
        path.join(root, "playwright", "e2e", "flows.spec.ts"),
        'test("flow", async () => {});\n'
      );
      await writeFile(
        path.join(root, "playwright", "utils", "selectors.ts"),
        "export const foo = 1;\n"
      );
      await writeFile(path.join(root, "test-results", "alpha.png"), "fake");
      await writeFile(path.join(root, "test-results", "beta.png"), "fake");
      await writeFile(path.join(root, "test-results", "nested", "gamma.png"), "fake");

      const stats = await collectTestStats(
        root,
        () => "test-results/beta.png\ntest-results/nested/gamma.png\nREADME.md\n"
      );

      expect(stats).toEqual({
        snapshots: 3,
        testfiles: 2,
        testcases: 3,
        updated: 2
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
