import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Battle state progress list", () => {
  test("renders and updates when the feature flag is enabled", async ({ page }) => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = {
          battleStateProgress: true,
          showRoundSelectModal: true
        };
      });

      await page.goto("/src/pages/battleClassic.html");

      // Start the round via the modal so the battle flow kicks in.
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons to be ready so the match has fully initialised.
      const statContainer = page.getByTestId("stat-buttons");
      await expect(statContainer).toHaveAttribute("data-buttons-ready", "true");

      const progress = page.getByTestId("battle-state-progress");
      const flagValue = await page.evaluate(() =>
        import("../helpers/featureFlags.js").then((mod) => mod.isEnabled("battleStateProgress"))
      );
      await expect(flagValue, "battleStateProgress flag should be enabled").toBe(true);

      await expect
        .poll(async () => {
          return await page.evaluate(() => {
            const list = document.getElementById("battle-state-progress");
            if (!list) return -2;
            if (!list.classList.contains("ready")) return -1;
            return list.children.length;
          });
        })
        .toBeGreaterThan(0);
      await expect(progress).toBeVisible();

      const debugBefore = await page.evaluate(() => {
        const list = document.getElementById("battle-state-progress");
        return {
          exists: !!list,
          childCount: list ? list.children.length : 0,
          display: list ? getComputedStyle(list).display : "missing"
        };
      });
      await expect(debugBefore.exists).toBe(true);
      await expect(
        debugBefore.childCount,
        "progress list should render state items"
      ).toBeGreaterThan(0);

      const items = progress.locator("li");
      const totalStates = await items.count();
      expect(totalStates).toBeGreaterThan(5);

      const activeBefore = await items
        .filter({ hasClass: "active" })
        .first()
        .getAttribute("data-state");
      expect(activeBefore).not.toBeNull();

      // Trigger a state transition by selecting the first stat button.
      const statButtons = page.getByTestId("stat-button");
      await statButtons.first().click();

      await expect
        .poll(async () => {
          return items.filter({ hasClass: "active" }).first().getAttribute("data-state");
        })
        .not.toEqual(activeBefore);

      await expect(items.filter({ hasClass: "active" }).first()).toHaveAttribute(
        "aria-current",
        "step"
      );
  });
});
