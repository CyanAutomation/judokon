import { test } from "@playwright/test";

// Run with: npx playwright test scripts/diagnosePlaywright.js
test("open battleJudoka and capture console + screenshot", async ({ page }) => {
  const logs = [];
  page.on("console", (msg) => logs.push({ type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => logs.push({ type: "pageerror", text: String(err) }));

  const url = "http://localhost:3000/src/pages/battleJudoka.html";
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: "playwright-diagnose-battleJudoka.png", fullPage: true });
  console.log("collected logs:\n", JSON.stringify(logs, null, 2));
});
