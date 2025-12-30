import { test, expect } from "./fixtures/battleCliFixture.js";
import { waitForBattleReady } from "./helpers/battleStateHelper.js";

// Spec coverage: CLI layout regression guard (match launch, settings accordion, focus order, no overflow)


const viewports = [
  { name: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "mobile", viewport: { width: 430, height: 900 } }
];

test.describe("CLI layout", () => {
  for (const { name, viewport } of viewports) {
    test.describe(name, () => {
      test.use({ viewport });

      test("launches a match and enforces layout contracts", async ({ page }) => {
        await page.goto("/src/pages/battleCLI.html?autostart=1");
        await waitForBattleReady(page, { allowFallback: false });

        await expect
          .poll(() => page.evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null))
          .toBe("waitingForPlayerAction");

        const cliRoot = page.locator('[data-test="cli-root"]');
        await expect(cliRoot).toBeVisible();

        const score = page.getByTestId("score-display");
        const roundCounter = page.getByTestId("round-counter");
        await expect(score).toContainText("You:");
        await expect(roundCounter).toHaveText(/Round\s+\d+/);

        const settingsSection = page.locator('details[aria-label="Match Settings"]');
        const settingsSummary = page.getByTestId("settings-summary");
        await expect(settingsSummary).toBeVisible();
        await expect(settingsSection).toHaveJSProperty("open", true);
        await settingsSummary.click();
        await expect(settingsSection).toHaveJSProperty("open", false);
        await settingsSummary.press("Enter");
        await expect(settingsSection).toHaveJSProperty("open", true);

        const statsList = page.getByRole("listbox", {
          name: /select a stat with number keys 1-5/i
        });
        await expect(statsList).toBeVisible();
        await expect(statsList).toHaveAttribute("aria-busy", "false");

        const focusOrder = [
          page.getByRole("link", { name: /skip to main content/i }),
          page.getByRole("link", { name: /home/i }),
          settingsSummary,
          page.getByLabel("Points to win"),
          page.getByLabel("Toggle verbose logging"),
          page.getByLabel("Deterministic seed (optional)"),
          statsList
        ];

        for (const [index, target] of focusOrder.entries()) {
          await target.waitFor({ state: "attached" });
          await target.waitFor({ state: "visible" });
          if (index === 0) {
            await target.focus();
            await expect(target).toBeFocused();
          } else {
            await expect(target).toBeFocused();
          }
          if (index < focusOrder.length - 1) {
            const nextTarget = focusOrder[index + 1];
            await nextTarget.waitFor({ state: "attached" });
            await nextTarget.waitFor({ state: "visible" });
            await page.keyboard.press("Tab");
            await expect(nextTarget).toBeFocused();
          }
        }

        const layout = await page.evaluate(() => {
          const main = document.getElementById("cli-main");
          if (!main) {
            throw new Error("cli-main element not found");
          }
          const scrollWidth = document.documentElement?.scrollWidth ?? 0;
          const viewportWidth = window.innerWidth;
          const mainRect = main.getBoundingClientRect();
          return {
            viewportWidth,
            pageScrollWidth: scrollWidth,
            mainRight: mainRect.right
          };
        });

        expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
        expect(layout.mainRight).toBeLessThanOrEqual(layout.viewportWidth);
      });
    });
  }
});
