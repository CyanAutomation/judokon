import { test, expect } from "../fixtures/commonSetup.js";
import {
  waitForBattleReady,
  waitForBattleState,
  waitForStatButtonsReady
} from "../helpers/battleStateHelper.js";

test.describe("Debug button state during cooldown", () => {
  test("track button state changes", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");

    // Inject monitoring code before battle starts
    await page.evaluate(() => {
      window.buttonStateLog = [];

      // Monitor actual DOM attribute changes with MutationObserver
      setTimeout(() => {
        const buttons = document.querySelectorAll('[data-testid="stat-button"]');
        buttons.forEach((btn) => {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === "attributes" && mutation.attributeName === "disabled") {
                const isDisabled = btn.hasAttribute("disabled");
                const battleState = document.body?.dataset?.battleState;
                const selInProgress =
                  document.getElementById("stat-buttons")?.dataset?.selectionInProgress;
                window.buttonStateLog.push({
                  type: isDisabled ? "DOM_DISABLED" : "DOM_ENABLED",
                  stat: btn.dataset.stat,
                  battleState: battleState,
                  selectionInProgress: selInProgress,
                  timestamp: Date.now(),
                  stack: new Error().stack.split("\n").slice(2, 6).join("\n")
                });
              }
            });
          });
          observer.observe(btn, { attributes: true });
        });
      }, 100);

      // Monitor enable calls
      Object.defineProperty(window, "__statButtonsEnableCount", {
        get() {
          return this._enableCount || 0;
        },
        set(val) {
          const prevState = document.body?.dataset?.battleState;
          const selInProgress =
            document.getElementById("stat-buttons")?.dataset?.selectionInProgress;
          window.buttonStateLog.push({
            type: "ENABLE",
            count: val,
            battleState: prevState,
            selectionInProgress: selInProgress,
            timestamp: Date.now()
          });
          this._enableCount = val;
        }
      });

      // Monitor disable calls
      Object.defineProperty(window, "__statButtonsDisableCount", {
        get() {
          return this._disableCount || 0;
        },
        set(val) {
          const prevState = document.body?.dataset?.battleState;
          const selInProgress =
            document.getElementById("stat-buttons")?.dataset?.selectionInProgress;
          window.buttonStateLog.push({
            type: "DISABLE",
            count: val,
            battleState: prevState,
            selectionInProgress: selInProgress,
            timestamp: Date.now()
          });
          this._disableCount = val;
        }
      });
    });

    await waitForBattleReady(page, { allowFallback: false, timeout: 10_000 });
    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });
    await waitForStatButtonsReady(page, { timeout: 10_000 });

    // Click first button
    const firstButton = page.getByTestId("stat-button").first();
    await firstButton.click();

    // Wait for cooldown
    await waitForBattleState(page, "cooldown", { timeout: 10_000 });

    // Get the log
    const log = await page.evaluate(() => window.buttonStateLog);

    console.log("\n=== Button State Log (showing only DOM changes during cooldown) ===");
    log.filter((entry) => entry.type.startsWith("DOM_") && entry.battleState === "cooldown").forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.type} - stat=${entry.stat}, selectionInProgress=${entry.selectionInProgress}`);
      if (entry.stack) {
        console.log(`   Stack: ${entry.stack.split("\n").slice(0, 3).join("\n   ")}`);
      }
    });
    console.log("=====================================================================\n");

    // Check actual button disabled property directly
    const buttonsDisabledProperty = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[data-testid="stat-button"]'));
      return buttons.map((btn) => ({
        stat: btn.dataset.stat,
        disabled: btn.disabled,
        hasDisabledAttr: btn.hasAttribute("disabled"),
        hasDisabledClass: btn.classList.contains("disabled")
      }));
    });
    console.log("\nActual button states:");
    buttonsDisabledProperty.forEach((b) => {
      console.log(
        `  ${b.stat}: disabled=${b.disabled}, attr=${b.hasDisabledAttr}, class=${b.hasDisabledClass}`
      );
    });

    // Check button state
    const disabledButtons = page.locator('[data-testid="stat-button"]:disabled');
    const disabledCount = await disabledButtons.count();
    console.log(`\nDisabled buttons via selector: ${disabledCount}`);

    const battleState = await page.evaluate(() => document.body?.dataset?.battleState);
    const selectionInProgress = await page.evaluate(
      () => document.getElementById("stat-buttons")?.dataset?.selectionInProgress
    );
    console.log(`Battle state: ${battleState}`);
    console.log(`Selection in progress: ${selectionInProgress}`);

    // This should pass but currently fails
    await expect(disabledButtons).toHaveCount(5);
  });
});
