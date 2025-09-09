import { test, expect } from "@playwright/test";

test.describe("State badge and debug panel", () => {
  test("badge visible and debug panel present with flags", async ({ page }) => {
    // Listen for all console messages
    const messages = [];
    page.on('console', msg => {
      messages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { enableTestMode: true, battleStateBadge: true };
    });
    
    await page.goto("/src/pages/battleClassic.html");
    
    // Check for console messages
    if (messages.length > 0) {
      console.log('Console messages:', messages.filter(m => m.includes('battleClassic')));
    }
    
    // Wait for initialization to complete and check document state
    const docState = await page.evaluate(() => ({
      readyState: document.readyState,
      hasScript: !!document.querySelector('script[src*="battleClassic.init.js"]')
    }));
    console.log('Document state:', docState);
    
    await page.waitForTimeout(500);
    
    // Debug initialization state
    const debugInfo = await page.evaluate(() => {
      const badge = document.getElementById('battle-state-badge');
      return {
        badge: {
          exists: !!badge,
          hidden: badge?.hidden,
          hasHiddenAttr: badge?.hasAttribute('hidden'),
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
    console.log('Debug info:', debugInfo);
    
    await expect(page.locator("#battle-state-badge")).toBeVisible();
    await expect(page.locator("#battle-state-badge")).toHaveText("Lobby");
  });
});
