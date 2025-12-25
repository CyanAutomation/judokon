import { describe, it, expect, vi } from "vitest";

const files = vi.hoisted(() => ({
  "test-results/a.png": "",
  "test-results/b.png": "",
  "playwright/a.spec.js": "test('a', () => {})",
  "playwright/b.spec.ts": "it('b', () => {})",
  "tests/c.test.js": "test('c1', () => {}); it('c2', () => {})"
}));

vi.mock("glob", () => ({
  glob: vi.fn(async (pattern) => {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    const results = [];
    for (const pat of patterns) {
      if (pat === "test-results/**/*.png") {
        results.push("test-results/a.png", "test-results/b.png");
      } else if (pat === "playwright/**/*.spec.@(js|ts)") {
        results.push("playwright/a.spec.js", "playwright/b.spec.ts");
      } else if (pat === "tests/**/*.{test,spec}.@(js|ts)") {
        results.push("tests/c.test.js");
      } else if (pat === "tests/**/*.@(js|ts)") {
        results.push("tests/c.test.js");
      } else if (pat === "playwright/**/*.@(js|ts)") {
        results.push("playwright/a.spec.js", "playwright/b.spec.ts");
      }
    }
    return results;
  })
}));

vi.mock("node:fs/promises", () => {
  const readFile = vi.fn(async (file) => files[file]);
  const appendFile = vi.fn();
  return { readFile, appendFile, default: { readFile, appendFile } };
});

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
      expect(result).toEqual(expect.stringContaining(`Roll: ${roll}`));
      expect(result).toEqual(expect.stringContaining(`*${throwName}*`));
    });
  });
});

describe("collectTestStats", () => {
  it("counts files, cases and updated snapshots", async () => {
    const stats = await collectTestStats("", () => "test-results/a.png\ntest-results/b.png\n");
    expect(stats).toEqual({
      snapshots: 2,
      testfiles: 3,
      testcases: 4,
      updated: 2
    });
  });
});
