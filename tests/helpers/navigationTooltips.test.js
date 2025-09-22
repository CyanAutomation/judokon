import { describe, it, expect } from "vitest";

import tooltips from "../../src/data/tooltips.json" with { type: "json" };
import gameModes from "../../src/data/gameModes.json" with { type: "json" };
import { navTooltipKey } from "../../src/helpers/navigationService.js";

describe("navigation tooltips coverage", () => {
  it("provides mode.* entries for every game mode name", () => {
    const keys = new Set(Object.keys(tooltips.mode || {}));
    const missing = [];
    for (const mode of gameModes) {
      const key = navTooltipKey(mode.name);
      if (!keys.has(key)) missing.push(key);
    }
    expect(missing).toEqual([]);
  });
});
