import { test, expect } from "@playwright/test";

test.describe("Battle CLI Network Debug", () => {
  test("debug network requests and module loading", async ({ page }) => {
    let networkRequests = [];
    let networkFailures = [];

    // Capture all network requests
    page.on("request", (request) => {
      if (
        request.url().includes(".js") ||
        request.url().includes("helper") ||
        request.url().includes("orchestrator")
      ) {
        networkRequests.push(request.url());
        console.log("📡 Request:", request.url());
      }
    });

    // Capture failed requests
    page.on("response", (response) => {
      if (!response.ok() && (response.url().includes(".js") || response.url().includes("helper"))) {
        networkFailures.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        console.log("❌ Failed request:", response.url(), response.status());
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem("battle.pointsToWin", "5");
    });

    // Navigate and capture the network traffic
    await page.goto("/src/pages/battleCLI.html");

    // Give time for all imports to complete/fail
    await page.waitForTimeout(3000);

    console.log("All JS requests:");
    networkRequests.forEach((req) => console.log(`  ${req}`));

    console.log("Failed requests:");
    networkFailures.forEach((fail) => console.log(`  ${fail.status} ${fail.url}`));

    // Check if the battleCLI init module itself loaded correctly
    const initModuleState = await page.evaluate(() => {
      // Check if the page's own script loaded and ran
      return {
        hasInitFunction: typeof window.init === "function",
        hasStore: !!window.battleStore,
        hasConstants: typeof window.STATS !== "undefined",
        windowKeys: Object.keys(window).filter(
          (key) => key.includes("battle") || key.includes("engine") || key.includes("orchestrator")
        )
      };
    });

    console.log("Init module state:", JSON.stringify(initModuleState, null, 2));

    // The key insight: find which specific module is failing to load
    expect(networkRequests.length).toBeGreaterThan(0);
  });
});
