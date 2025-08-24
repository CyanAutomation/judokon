import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // mimic test setup: enable test mode in localStorage
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem(
      "settings",
      JSON.stringify({ featureFlags: { enableTestMode: { enabled: false } } })
    );
  });
  await page.goto("http://localhost:3000/src/pages/battleJudoka.html");
  await page.evaluate(() => window.skipBattlePhase?.());
  await page.evaluate(() => window.freezeBattleHeader?.());
  await page.evaluate(() => window.__resetForTest && window.__resetForTest());
  // Apply tie round as tests do
  await page.evaluate(() => {
    document.getElementById("next-round-timer").textContent = "Time Left: 3s";
    document.getElementById("player-card").innerHTML =
      `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
  });
  await page.locator("button[data-stat='power']").click();
  const containerHtml = await page.evaluate(() => {
    const c = document.getElementById("snackbar-container");
    return c ? c.innerHTML : null;
  });
  console.log("SNACKBAR CONTAINER HTML:", containerHtml);
  await browser.close();
})();
