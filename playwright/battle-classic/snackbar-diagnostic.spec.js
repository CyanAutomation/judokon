import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Snackbar diagnostic tests", () => {
  test("verify EventTarget identity consistency across stat selection", async ({ page }) => {
    // Capture console logs
    const consoleLogs = [];
    page.on("console", (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });

    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      // Start the match via modal
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons to be ready
      const container = page.getByTestId("stat-buttons");
      await expect(container).toHaveAttribute("data-buttons-ready", "true");

      // BEFORE clicking stat button, gather diagnostic data
      const beforeState = await page.evaluate(() => {
        const target = globalThis.__classicBattleEventTarget;

        // Mark the target for identity tracking (should already be stamped)
        const debugId = target?.__debugId || "NO_ID";
        const createdAt = target?.__createdAt || "NO_TIMESTAMP";

        return {
          // Bootstrap status
          initCalled: !!window.__initCalled,
          testAPI: !!window.__TEST_API,

          // EventTarget status
          eventTargetExists: !!target,
          eventTargetId: debugId,
          createdAt: createdAt,

          // WeakSet status
          weakSetExists: globalThis.__cbUIHelpersDynamicBoundTargets instanceof WeakSet,

          // Test if statSelected handler is registered by dispatching test event
          handlerRegistrationTest: (() => {
            if (!target) return { error: "no target" };

            let handlerCalled = false;
            const testHandler = () => {
              handlerCalled = true;
            };

            target.addEventListener("statSelected", testHandler);
            target.dispatchEvent(
              new CustomEvent("statSelected", {
                detail: {
                  store: {},
                  stat: "power",
                  playerVal: 5,
                  opponentVal: 5,
                  opts: {}
                }
              })
            );
            target.removeEventListener("statSelected", testHandler);

            return { handlerCalled };
          })(),

          // Check if actual battle event handlers are registered
          listenerCount: (() => {
            if (!target) return 0;
            // We can't directly count listeners, but we can check if our test handler worked
            return target.__debugId ? "has_id" : "no_id";
          })()
        };
      });

      console.log("BEFORE stat selection:", JSON.stringify(beforeState, null, 2));

      // Verify bootstrap completed
      expect(beforeState.initCalled).toBe(true);
      expect(beforeState.eventTargetExists).toBe(true);
      expect(beforeState.eventTargetId).not.toBe("NO_ID");
      expect(beforeState.handlerRegistrationTest.handlerCalled).toBe(true);

      // Click stat button
      const buttons = page.getByTestId("stat-button");
      await buttons.first().click();

      // Give time for any async operations
      await page.waitForTimeout(500);

      // AFTER clicking, check state again
      const afterState = await page.evaluate(() => {
        const target = globalThis.__classicBattleEventTarget;

        return {
          eventTargetId: target?.__debugId || "NO_ID",
          createdAt: target?.__createdAt || "NO_TIMESTAMP",
          bodyDataStatSelected: document.body.getAttribute("data-stat-selected"),
          snackbarExists: !!document.querySelector(".snackbar"),
          snackbarContent: document.querySelector(".snackbar")?.textContent || null
        };
      });

      console.log("AFTER stat selection:", JSON.stringify(afterState, null, 2));

      // CRITICAL: Verify EventTarget identity didn't change
      expect(afterState.eventTargetId).toBe(beforeState.eventTargetId);

      // Verify stat selection DID happen
      expect(afterState.bodyDataStatSelected).toBe("true");

      // THE BUG: This assertion will fail if snackbar doesn't appear
      expect(afterState.snackbarExists).toBe(true);
      if (afterState.snackbarExists) {
        expect(afterState.snackbarContent).toContain("Opponent");
      }
    }, ["log", "info", "warn", "error", "debug"]);
  });

  test("verify handler registration and execution chain", async ({ page }) => {
    await withMutedConsole(async () => {
      // Instrument the page to capture handler execution
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
        window.__diagnosticLog = [];

        // Intercept showSnackbar calls
        window.addEventListener("DOMContentLoaded", () => {
          const originalShowSnackbar = window.showSnackbar;
          if (originalShowSnackbar) {
            window.showSnackbar = function (...args) {
              window.__diagnosticLog.push({
                type: "showSnackbar",
                timestamp: Date.now(),
                args: args
              });
              return originalShowSnackbar.apply(this, args);
            };
          }
        });
      });

      await page.goto("/src/pages/battleClassic.html");

      // Start the match
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons
      const container = page.getByTestId("stat-buttons");
      await expect(container).toHaveAttribute("data-buttons-ready", "true");

      // Click stat button
      const buttons = page.getByTestId("stat-button");
      await buttons.first().click();

      // Wait and check diagnostic log
      await page.waitForTimeout(500);

      const diagnostics = await page.evaluate(() => window.__diagnosticLog);
      console.log("Diagnostic log:", JSON.stringify(diagnostics, null, 2));

      // Verify showSnackbar was called
      const snackbarCalls = diagnostics.filter((log) => log.type === "showSnackbar");
      expect(snackbarCalls.length).toBeGreaterThan(0);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
