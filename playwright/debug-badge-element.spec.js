import { test } from "@playwright/test";
import { waitForBattleState } from "./fixtures/waits.js";

test("debug badge element", async ({ page }) => {
  await page.evaluate(() => {
    try {
      localStorage.setItem(
        "settings",
        JSON.stringify({
          featureFlags: {
            cliShortcuts: { enabled: true },
            battleStateBadge: { enabled: true }
          }
        })
      );
    } catch {}
    // Speed up inter-round where possible
    window.__NEXT_ROUND_COOLDOWN_MS = 0;
  });

  // Use autostart=1 like our working debug test
  await page.goto("/src/pages/battleCLI.html?autostart=1");

  // Wait for battle to start normally
  await waitForBattleState(page, "waitingForPlayerAction", 15000);

  // Check what battle-state related elements exist
  const battleElements = await page.evaluate(() => {
    // Look for various possible badge selectors
    const selectors = [
      '[data-testid="battle-state-badge"]',
      ".battle-state-badge",
      "#battle-state-badge",
      "[data-battle-state-badge]",
      ".badge",
      '[class*="badge"]',
      '[id*="badge"]',
      '[data-testid*="badge"]'
    ];

    const found = {};
    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        found[selector] = Array.from(elements).map((el) => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent?.trim() || "",
          visible: el.offsetParent !== null,
          style: {
            display: getComputedStyle(el).display,
            visibility: getComputedStyle(el).visibility,
            opacity: getComputedStyle(el).opacity
          }
        }));
      }
    });

    return {
      found,
      currentState: document.body?.dataset?.battleState,
      featureFlags: window.featureFlagsEmitter?.getFlags
        ? window.featureFlagsEmitter.getFlags()
        : "unavailable",
      allElements: document.querySelectorAll(
        '*[class*="state"], *[id*="state"], *[data-testid*="state"]'
      ).length
    };
  });

  console.log("=== BADGE DEBUG ===");
  console.log(JSON.stringify(battleElements, null, 2));
});
