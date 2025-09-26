import { describe, it, expect, beforeEach } from "vitest";
import { STATS } from "../../src/helpers/BattleEngine.js";
import { createStatButtonsHarness } from "../utils/componentTestUtils.js";

describe("Stat buttons ARIA descriptions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds aria-describedby per stat with hidden description", async () => {
    const harness = await createStatButtonsHarness();

    try {
      expect(harness.container).toBeTruthy();
      for (const stat of STATS) {
        const button = harness.getButton(stat);
        expect(button).toBeTruthy();

        const descId = button?.getAttribute("aria-describedby");
        expect(descId).toBe(`stat-desc-${stat}`);

        const desc = descId ? document.getElementById(descId) : null;
        expect(desc).toBeTruthy();
        expect(desc?.classList.contains("sr-only")).toBe(true);
        expect((desc?.textContent || "").trim().length).toBeGreaterThan(0);
      }
    } finally {
      harness.cleanup();
    }
  });
});
