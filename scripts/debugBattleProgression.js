/**
 * Battle progression debugger: navigate, probe machine/store, click a stat, report snapshot.
 *
 * @pseudocode
 * 1. Build URL from BASE_URL/PORT; parse env flags.
 * 2. Launch Chromium with HEADLESS flag; attach loggers and selector guard.
 * 3. Navigate to battle page with autostart.
 * 4. Optionally wait for buttons ready and/or pre-seed store selection.
 * 5. Try to click chosen STAT; optionally force DOM-dispatch if enabled.
 * 6. Wait briefly for guard/outcome; collect a structured snapshot.
 * 7. Save screenshot(s) and print summary; set exit code on fatal errors.
 */
import { chromium } from "playwright";
import {
  buildBaseUrl,
  installSelectorGuard,
  attachLoggers,
  waitButtonsReady,
  getStatButtons,
  tryClickStat,
  getBattleSnapshot,
  takeScreenshot
} from "./lib/debugUtils.js";

(async function run() {
  const headless = process.env.HEADLESS !== "0";
  const stat = process.env.STAT || "power";
  const preseed = process.env.DEBUG_PRESEED_CHOICE === "1";
  const forceClick = process.env.DEBUG_FORCE_CLICK === "1";
  const waitReady = process.env.WAIT_BUTTONS_READY === "1";
  const disabledShotPath =
    process.env.SCREENSHOT_PATH_DISABLED ||
    "/workspaces/judokon/playwright-battleProgression-disabled.png";
  const shotPath =
    process.env.SCREENSHOT_PATH || "/workspaces/judokon/playwright-battleProgression.png";
  const base = buildBaseUrl();
  const url = `${base}/src/pages/battleJudoka.html?autostart=1`;

  const launchOptions = { headless };
  if (process.env.GOOGLE_CHROME_PATH) launchOptions.executablePath = process.env.GOOGLE_CHROME_PATH;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();
  await installSelectorGuard(page);
  attachLoggers(page, { withLocations: true });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    console.log("TITLE", await page.title());

    if (waitReady) {
      await waitButtonsReady(page, { requireReadyFlag: true, timeout: 8000 });
    }

    let names = await getStatButtons(page);
    if (!names.length && !waitReady) {
      try {
        await waitButtonsReady(page, { requireReadyFlag: false, timeout: 1500 });
      } catch {}
      names = await getStatButtons(page);
    }

    console.log("STAT BUTTONS", JSON.stringify(names));

    if (preseed) {
      try {
        await page.evaluate((chosen) => {
          try {
            if (window.battleStore && !window.battleStore.playerChoice) {
              window.battleStore.playerChoice = chosen;
              window.battleStore.selectionMade = true;
            }
          } catch {}
        }, stat);

        console.log(`Pre-seeded playerChoice="${stat}" in window.battleStore`);
      } catch {}
    }

    // Probe quick machine info
    try {
      const machineInfo = await page.evaluate(() => {
        try {
          if (typeof window.__getBattleSnapshot === "function") {
            return { helper: "__getBattleSnapshot", value: window.__getBattleSnapshot() };
          }
          if (typeof window.getBattleSnapshot === "function") {
            return { helper: "getBattleSnapshot", value: window.getBattleSnapshot() };
          }
          if (typeof window.__classicBattleState !== "undefined") {
            return { helper: "__classicBattleState", value: window.__classicBattleState };
          }
        } catch {}
        return null;
      });
      if (machineInfo) {
        console.log("MACHINE INFO (immediate):", machineInfo.helper, machineInfo.value);
      }
    } catch {}

    // Attempt to click chosen stat
    const clickRes = await tryClickStat(page, stat, { force: forceClick, timeout: 1500 });

    console.log("CLICK", stat, JSON.stringify(clickRes));

    if (!clickRes.ok && !forceClick) {
      const snap = await getBattleSnapshot(page);

      console.log("DISABLED_STATE", JSON.stringify(snap, null, 2));
      await takeScreenshot(page, disabledShotPath);
      process.exitCode = 1;
      return;
    }

    // Short settle for immediate handlers/guard
    try {
      const guardOutcome = await page.evaluate(() => window.__guardOutcomeEvent || null);
      if (!guardOutcome) await page.waitForTimeout(200);
    } catch {
      await page.waitForTimeout(200);
    }

    const snap = await getBattleSnapshot(page);

    console.log("AFTER CLICK", JSON.stringify(snap, null, 2));

    const debugText = await page.$eval("#debug-output", (el) => el.textContent).catch(() => null);

    console.log("DEBUG PANEL", debugText);

    await takeScreenshot(page, shotPath);
  } catch (err) {
    console.error("ERROR", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
