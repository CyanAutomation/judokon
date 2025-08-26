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
  // No global watchdog; rely on Playwright timeouts to avoid racing closure

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  await installSelectorGuard(page);
  attachLoggers(page, { withLocations: true });

  try {
    // No external watchdog here; page.waitForFunction below uses its own timeout.

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    console.log("TITLE", await page.title());

    // Pre-click snapshot
    const pre = await getBattleSnapshot(page).catch(() => null);
    console.log("PRE CLICK SNAP", JSON.stringify(pre, null, 2));

    // Wait for the chosen stat button to become enabled before clicking.
    const selector = `#stat-buttons button[data-stat="${stat}"]`;
    try {
      console.log("WAIT: waiting for stat button to be enabled", stat);
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
      console.log("WAIT: stat button enabled", stat);
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

    // Wait for one of the canonical resolution signals using page.waitForFunction
    try {
      await page.waitForFunction(
        () => {
          try {
            const bs = document.body?.dataset?.battleState;
            const pc = window?.battleStore?.playerChoice;
            const rd = window.__roundDebug;
            if (rd && rd.resolvedAt) return true;
            if (bs === "roundOver" || bs === "cooldown") return true;
            if (pc === null) return true;
            return false;
          } catch {
            return false;
          }
        },
        { timeout: overallTimeout }
      );
      console.log("RESOLVED: waitForFunction observed resolution signal");
    } catch {
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
    // nothing to clean up here
    try {
      await browser.close();
    } catch {}
  }
})();
