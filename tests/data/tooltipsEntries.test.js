// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const tooltips = JSON.parse(readFileSync(resolve("src/data/tooltips.json"), "utf8"));

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

describe("tooltips.json", () => {
  it("contains new ui tooltip entries", () => {
    const keys = [
      "ui.languageToggle",
      "ui.next",
      "ui.quitMatch",
      "ui.drawCard",
      "card.flag",
      "ui.roundQuick",
      "ui.roundMedium",
      "ui.roundLong",
      "ui.toggleLayout"
    ];
    for (const key of keys) {
      expect(get(tooltips, key)).toBeDefined();
    }
  });
});
