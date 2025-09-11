import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("State badge and debug panel", () => {
  test("badge visible and debug panel present with flags", async ({ page }) => withMutedConsole(async () => {
    // Listen for all console messages
    const messages = [];
    page.on("console", (msg) => {
      const text = `${msg.type()}: ${msg.text()}`;
      messages.push(text);
      if (msg.type() === "error") {
        console.log("Browser error:", text);
      }
    });

    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { enableTestMode: true, battleStateBadge: true };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Check for console messages
    const battleMessages = messages.filter((m) => m.includes("battleClassic"));
    const errorMessages = messages.filter((m) => m.startsWith("error:"));
    if (battleMessages.length > 0) {
      console.log("Battle messages:", battleMessages);
    }
    if (errorMessages.length > 0) {
      console.log("Error messages:", errorMessages);
    }

    // Wait for initialization to complete and check document state
    const docState = await page.evaluate(() => ({
      readyState: document.readyState,
      hasScript: !!document.querySelector('script[src*="battleClassic.init.js"]')
    }));
    console.log("Document state:", docState);

    await page.waitForTimeout(500);

    // Debug initialization state
    const debugInfo = await page.evaluate(() => {
      const badge = document.getElementById("battle-state-badge");
      return {
        badge: {
          exists: !!badge,
          hidden: badge?.hidden,
          hasHiddenAttr: badge?.hasAttribute("hidden"),
          textContent: badge?.textContent,
          style: badge?.style.display
        },
        featureFlags: {
          overrides: window.__FF_OVERRIDES,
          battleStateBadge: window.__FF_OVERRIDES?.battleStateBadge
        },
        initCalled: !!window.__initCalled
      };
    });
    console.log("Debug info:", debugInfo);

    await expect(page.locator("#battle-state-badge")).toBeVisible();
    await expect(page.locator("#battle-state-badge")).toHaveText("Lobby");
  }, ["log", "warn", "error"]));
});