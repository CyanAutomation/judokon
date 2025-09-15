import { test } from "./fixtures/commonSetup.js";

test("debug stat loading issue", async ({ page }) => {
  const logs = [];

  // Capture all console messages
  page.on("console", (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Go to the page
  await page.goto("/src/pages/battleCLI.html");

  // Try to start a match
  const startBtn = page.locator("#start-match-button");
  if ((await startBtn.count()) > 0) {
    await startBtn.click();
  }

  // Allow network to settle and UI to render
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("#cli-stats", { timeout: 5000 });

  // Print all console messages
  console.log("=== Console Messages ===");
  logs.forEach((log) => console.log(log));

  // Check if stat list is populated
  const statElements = await page.locator("#cli-stats .cli-stat").count();
  console.log(`Found ${statElements} stat elements`);

  const statsContent = await page.locator("#cli-stats").innerHTML();
  console.log("Stats container content:", statsContent);
});
