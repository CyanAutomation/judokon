import { test, expect } from "@playwright/test";

test.describe("Debug script loading", () => {
  test("check for JavaScript errors and network issues", async ({ page }) => {
    const errors = [];
    const networkFailures = [];

    // Capture JavaScript errors
    page.on("pageerror", (err) => {
      errors.push(`Page error: ${err.message}`);
      console.log("Page error:", err.message);
    });

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`Console error: ${msg.text()}`);
        console.log("Console error:", msg.text());
      }
    });

    // Capture network failures
    page.on("response", (response) => {
      if (!response.ok()) {
        networkFailures.push(`Network failure: ${response.status()} ${response.url()}`);
        console.log("Network failure:", response.status(), response.url());
      }
    });

    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { enableTestMode: true, battleStateBadge: true };
    });

    await page.goto("/src/pages/battleClassic.html");
    await page.waitForTimeout(2000);

    console.log("Errors found:", errors);
    console.log("Network failures:", networkFailures);

    const scriptInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
      return scripts.map((script) => ({
        src: script.src,
        loaded: script.complete || script.readyState === "complete"
      }));
    });

    console.log("Script info:", scriptInfo);

    // Check if any errors occurred
    expect(errors).toHaveLength(0);
    expect(networkFailures).toHaveLength(0);
  });
});
