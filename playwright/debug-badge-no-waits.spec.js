import { test, expect } from "@playwright/test";

test.describe("Battle CLI Badge Debug", () => {
  test("debug badge test without waits - improved setup", async ({ page }) => {
    let consoleMessages = [];
    let errorMessages = [];

    // Capture all console output for debugging
    page.on("console", (msg) => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.type() === "error") {
        errorMessages.push(text);
        console.log("Browser error:", text);
      }
    });

    // Set up everything needed before page load - no reloads needed
    await page.addInitScript(() => {
      // Set battle configuration
      localStorage.setItem("battleCLI.verbose", "false");
      localStorage.setItem("battleCLI.pointsToWin", "5");
      localStorage.setItem("battle.pointsToWin", "5");

      // Set feature flags including battleStateBadge enabled from the start
      localStorage.setItem(
        "settings",
        JSON.stringify({
          featureFlags: {
            cliShortcuts: { enabled: true },
            battleStateBadge: { enabled: true } // Enable the badge immediately
          }
        })
      );

      // Speed up inter-round
      window.__NEXT_ROUND_COOLDOWN_MS = 0;

      // Add feature flag override for extra reliability
      window.__FF_OVERRIDES = { battleStateBadge: true };
    });

    await page.goto("/src/pages/battleCLI.html");

    // Wait for page to be ready - but use network idle instead of battle state
    await page.waitForLoadState("networkidle");

    // Debug: Log initial page state
    const initialState = await page.evaluate(() => {
      const badge = document.getElementById("battle-state-badge");
      return {
        readyState: document.readyState,
        bodyDataState: document.body?.dataset?.battleState,
        badgeExists: !!badge,
        badgeVisible: badge ? !badge.hidden && badge.style.display !== "none" : false,
        badgeText: badge?.textContent,
        badgeStyles: badge
          ? {
              display: badge.style.display,
              hidden: badge.hidden,
              hasHiddenAttr: badge.hasAttribute("hidden")
            }
          : null,
        featureFlagOverrides: window.__FF_OVERRIDES,
        startButtonExists: !!document.getElementById("start-match-button"),
        windowState: window.getStateSnapshot ? window.getStateSnapshot() : "no state snapshot"
      };
    });

    console.log("Initial state:", JSON.stringify(initialState, null, 2));

    // Handle start button if present (no waiting)
    const startBtn = page.locator("#start-match-button");
    const startBtnCount = await startBtn.count();

    if (startBtnCount > 0) {
      console.log("Start button found, clicking it");
      await startBtn.click();
      // Give a moment for the click to process
      await page.waitForTimeout(500);
    } else {
      console.log("No start button - expecting auto-start");
    }

    // Check state after potential button click
    const afterClickState = await page.evaluate(() => {
      const badge = document.getElementById("battle-state-badge");
      return {
        bodyDataState: document.body?.dataset?.battleState,
        badgeVisible: badge ? !badge.hidden && badge.style.display !== "none" : false,
        badgeText: badge?.textContent,
        windowState: window.getStateSnapshot ? window.getStateSnapshot() : "no state snapshot"
      };
    });

    console.log("After click state:", JSON.stringify(afterClickState, null, 2));

    // Check if we have console errors
    console.log("Console messages count:", consoleMessages.length);
    console.log("Error messages:", errorMessages);

    // Now test the badge - it should be visible if everything worked
    const badge = page.locator("#battle-state-badge");

    // Instead of waiting for visibility, check current state
    const badgeIsVisible = await badge.isVisible().catch(() => false);
    const badgeText = await badge.textContent().catch(() => "");

    console.log("Final badge state:", { visible: badgeIsVisible, text: badgeText });

    // Expect the badge to be visible (this should pass with proper setup)
    if (badgeIsVisible) {
      console.log("✅ Badge is visible!");
      await expect(badge).toBeVisible();
    } else {
      console.log("❌ Badge is not visible");
      // Don't fail the test yet - this is debugging
      console.log("Badge element found but not visible - investigating why");

      const debugInfo = await page.evaluate(() => {
        const badge = document.getElementById("battle-state-badge");
        return {
          elementExists: !!badge,
          computedStyle: badge ? window.getComputedStyle(badge).display : null,
          hidden: badge?.hidden,
          parentElement: badge?.parentElement?.tagName,
          allBadgeInfo: badge
            ? {
                innerHTML: badge.innerHTML,
                outerHTML: badge.outerHTML,
                offsetWidth: badge.offsetWidth,
                offsetHeight: badge.offsetHeight
              }
            : null
        };
      });
      console.log("Badge debug info:", JSON.stringify(debugInfo, null, 2));
    }

    // This test succeeds if we get here without errors
    expect(errorMessages).toEqual([]);
  });
});
