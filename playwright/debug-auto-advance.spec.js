import { test, expect } from "./fixtures/commonSetup.js";

test("Debug auto-advance navigation", async ({ page }) => {
  console.log("\n=== Auto-Advance Navigation Debug ===\n");
  
  await page.goto("/index.html");
  console.log("1. Loaded index.html");
  
  // Set up navigation promise BEFORE clicking
  const navigationPromise = page.waitForURL("**/battleClassic.html", { timeout: 10000 });
  console.log("2. Set up navigation promise");
  
  let startBtn = await page.$('[data-testid="start-classic"]');
  if (!startBtn) {
    startBtn = await page.getByText("Classic Battle").first();
  }
  console.log("3. Found start button");
  
  await startBtn.click();
  console.log("4. Clicked start button");
  
  try {
    await navigationPromise;
    console.log("5. Navigation completed");
  } catch (error) {
    console.log("5. Navigation FAILED:", error.message);
    console.log("   Current URL:", await page.url());
  }
  
  // Check Test API availability immediately
  const immediate = await page.evaluate(() => ({
    testApi: typeof window.__TEST_API !== "undefined",
    url: window.location.href
  }));
  console.log("6. Immediate check after navigation:", JSON.stringify(immediate, null, 2));
  
  // Wait a bit and check again
  await page.waitForTimeout(1000);
  const delayed = await page.evaluate(() => ({
    testApi: typeof window.__TEST_API !== "undefined",
    initApi: typeof window.__TEST_API?.init !== "undefined"
  }));
  console.log("7. After 1s delay:", JSON.stringify(delayed, null, 2));
  
  console.log("\n=== End Debug ===\n");
});
