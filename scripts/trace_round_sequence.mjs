import playwright from "playwright";

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__OVERRIDE_TIMERS = { roundTimer: 1 };
    window.__NEXT_ROUND_COOLDOWN_MS = 500;
    window.__FF_OVERRIDES = { showRoundSelectModal: true };
    window.__DEBUG_ROUND_TRACKING = true;
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/src/pages/battleClassic.html").catch(() => {});
  // wait for modal and click Medium
  await page.waitForSelector("#round-select-2", { state: "visible", timeout: 5000 });
  await page.click("#round-select-2");
  // wait for stat buttons and click one
  await page.waitForSelector("#stat-buttons button[data-stat]", { timeout: 5000 });
  await page.click("#stat-buttons button[data-stat]");
  // wait for next to be ready
  await page.waitForSelector('#next-button[data-next-ready="true"]', { timeout: 5000 });
  // dump rtrace logs and some globals
  const logs = await page.evaluate(() => ({
    rtrace: window.__RTRACE_LOGS || [],
    highestGlobal: window.__highestDisplayedRound,
    lastContext: window.__lastRoundCounterContext,
    previousContext: window.__previousRoundCounterContext,
    engineRoundsPlayed: window.__TEST_API?.engine?.getRoundsPlayed?.()
  }));
  console.log("TRACE RESULT:", JSON.stringify(logs, null, 2));
  await browser.close();
})();
