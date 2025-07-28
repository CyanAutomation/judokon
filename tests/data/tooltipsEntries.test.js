// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const tooltips = JSON.parse(readFileSync(resolve("src/data/tooltips.json"), "utf8"));

describe("tooltips.json", () => {
  it("contains new ui tooltip entries", () => {
    const keys = ["ui.languageToggle", "ui.nextRound", "ui.quitMatch", "ui.drawCard"];
    for (const key of keys) {
      expect(tooltips).toHaveProperty(key);
    }
  });
});
