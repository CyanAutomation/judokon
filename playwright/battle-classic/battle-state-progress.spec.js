import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Battle state progress list", () => {
  test("renders and updates when the feature flag is enabled", async ({ page }) =>
    withMutedConsole(async () => {
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

      await page.evaluate(() =>
        import("../helpers/battleStateProgress.js").then((mod) => mod.initBattleStateProgress())
      );

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

      const visibilitySnapshot = await page.evaluate(() => {
        const list = document.getElementById("battle-state-progress");
        if (!list) {
          return { exists: false };
        }
        const rect = list.getBoundingClientRect();
        return {
          exists: true,
          display: getComputedStyle(list).display,
          visibility: getComputedStyle(list).visibility,
          opacity: getComputedStyle(list).opacity,
          width: rect.width,
          height: rect.height,
          parentHidden: !!list.closest("[hidden]")
        };
      });
      await expect(visibilitySnapshot.exists).toBe(true);
      await expect(visibilitySnapshot.display).toBe("flex");
      await expect(visibilitySnapshot.visibility).toBe("visible");
      await expect(Number(visibilitySnapshot.opacity)).toBeGreaterThan(0);
      await expect(visibilitySnapshot.width).toBeGreaterThan(0);
      await expect(visibilitySnapshot.height).toBeGreaterThan(0);
      await expect(visibilitySnapshot.parentHidden).toBe(false);

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

      await expect(items.first()).toHaveAttribute("data-state", "waitingForMatchStart");
    }, ["log", "info", "warn", "error", "debug"]));
});
