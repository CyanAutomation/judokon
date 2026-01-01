import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    const stats = await collectTestStats(
      root,
      () => "test-results/a.png\nnotes.md\n"
    );
    expect(stats).toEqual({
      snapshots: 2,
      testfiles: 3,
      testcases: 4,
      updated: 1
    });
  });
});
