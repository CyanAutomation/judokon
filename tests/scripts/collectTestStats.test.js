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
    const results = [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((n) => rollDice(() => n));
    expect(results).toEqual([
      "🎲 Roll: 1 — *Seoi Nage* lightning strike! ⚡️ Shoulder throw supremacy.",
      "🎲 Roll: 2 — *Osoto Gari* sweep! 🌪 The ground says hello.",
      "🎲 Roll: 3 — *Uchi Mata* whirl! 🌀 You’re airborne now.",
      "🎲 Roll: 4 — *Harai Goshi* slash! 🌊 A clean hip-and-leg combo.",
      "🎲 Roll: 5 — *Tai Otoshi* drop! 💥 Straight to the tatami.",
      "🎲 Roll: 6 — *Kouchi Gari* trip! 🎯 Small but deadly."
    ]);
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
