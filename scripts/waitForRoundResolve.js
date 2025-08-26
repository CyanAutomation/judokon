import { chromium } from "playwright";
import {
  buildBaseUrl,
  installSelectorGuard,
  attachLoggers,
  tryClickStat,
  getBattleSnapshot,
  takeScreenshot
} from "./lib/debugUtils.js";

(async function run() {
  const headless = process.env.HEADLESS !== "0";
  const stat = process.env.STAT || "power";
  const base = buildBaseUrl();
  const url = `${base}/src/pages/battleJudoka.html?autostart=1`;
  const overallTimeout = parseInt(process.env.DEBUG_TIMEOUT_MS || "30000", 10);

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  await installSelectorGuard(page);
  attachLoggers(page, { withLocations: true });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    console.log("TITLE", await page.title());

    // Pre-click snapshot
    const pre = await getBattleSnapshot(page).catch(() => null);
    console.log("PRE CLICK SNAP", JSON.stringify(pre, null, 2));

    // Wait for the chosen stat button to become enabled before clicking.
    const selector = `#stat-buttons button[data-stat="${stat}"]`;
    try {
      await page.waitForFunction(
        (sel) => {
          try {
            const el = document.querySelector(sel);
            return !!el && !el.disabled;
          } catch {
            return false;
          }
        },
        selector,
        { timeout: 8000 }
      );
    } catch {}

    const clickRes = await tryClickStat(page, stat, { timeout: 3000 });
    console.log("CLICK", stat, JSON.stringify(clickRes));

    if (!clickRes.ok) {
      const snap = await getBattleSnapshot(page).catch(() => null);
      console.log("DISABLED_STATE", JSON.stringify(snap, null, 2));
      await takeScreenshot(page, "/workspaces/judokon/waitForRound-disabled.png");
      process.exitCode = 1;
      return;
    }

    // Wait until one of: window.__roundDebug.resolvedAt, document.body.dataset.battleState is roundOver/cooldown, or store.playerChoice == null
    const start = Date.now();
    const max = overallTimeout;
    let resolved = false;
    while (Date.now() - start < max) {
      const info = await page
        .evaluate(() => {
          try {
            return {
              battleState: document.body?.dataset?.battleState || null,
              playerChoice: window?.battleStore?.playerChoice || null,
              roundDebug: window.__roundDebug || null,
              guardOutcome: window.__guardOutcomeEvent || null
            };
          } catch {
            return null;
          }
        })
        .catch(() => null);

      console.log("POLL", JSON.stringify(info));

      if (info) {
        if (info.roundDebug && info.roundDebug.resolvedAt) {
          resolved = true;
          console.log("RESOLVED via roundDebug.resolvedAt", info.roundDebug.resolvedAt);
          break;
        }
        if (info.battleState === "roundOver" || info.battleState === "cooldown") {
          resolved = true;
          console.log("RESOLVED via battleState", info.battleState);
          break;
        }
        if (info.playerChoice === null) {
          resolved = true;
          console.log("RESOLVED via playerChoice cleared");
          break;
        }
      }

      await page.waitForTimeout(200);
    }

    if (!resolved) {
      console.log("TIMED OUT waiting for resolution");
      process.exitCode = 2;
    }

    const snap = await getBattleSnapshot(page).catch(() => null);
    console.log("FINAL SNAP", JSON.stringify(snap, null, 2));
    const shot = "/workspaces/judokon/waitForRound-final.png";
    await takeScreenshot(page, shot);
    console.log("screenshot saved:", shot);
  } catch (err) {
    console.error("ERROR", err);
    process.exitCode = 1;
  } finally {
    try {
      await browser.close();
    } catch {}
  }
})();
