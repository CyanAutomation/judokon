import { describe, it, expect } from "vitest";
import { collectTestStats, rollDice } from "../../scripts/collectTestStats.mjs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function setupTempProject() {
  const root = await mkdtemp(path.join(tmpdir(), "stats-"));
  await mkdir(path.join(root, "test-results"), { recursive: true });
  await writeFile(path.join(root, "test-results", "a.png"), "");
  await writeFile(path.join(root, "test-results", "b.png"), "");
  await mkdir(path.join(root, "playwright"), { recursive: true });
  await writeFile(path.join(root, "playwright", "a.spec.js"), "test('a', () => {})");
  await writeFile(path.join(root, "playwright", "b.spec.ts"), "it('b', () => {})");
  await mkdir(path.join(root, "tests"), { recursive: true });
  await writeFile(
    path.join(root, "tests", "c.test.js"),
    "test('c1', () => {}); it('c2', () => {})"
  );
  return root;
}

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
    const root = await setupTempProject();
    const stats = await collectTestStats(root, () => "test-results/a.png\ntest-results/b.png\n");
    expect(stats).toEqual({
      snapshots: 2,
      testfiles: 3,
      testcases: 4,
      updated: 2
    });
  });
});
