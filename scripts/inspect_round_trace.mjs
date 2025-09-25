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
  // wait a bit for the page to initialize
  await page.waitForTimeout(2000);
  const logs = await page.evaluate(() => JSON.stringify(window.__RTRACE_LOGS || []));
  console.log("RTRACE_LOGS:", logs);
  await browser.close();
})();
