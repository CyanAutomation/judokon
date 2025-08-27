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

  // Prevent the whole script from hanging indefinitely. Adjustable via DEBUG_TIMEOUT_MS (ms).
  const overallTimeout = parseInt(process.env.DEBUG_TIMEOUT_MS || "30000", 10);
  let timeoutId = null;
  let browser = null;
  let timedOut = false;
  timeoutId = setTimeout(() => {
    console.error(`ERROR: debugBattleProgression overall timeout after ${overallTimeout}ms`);
    // Mark timed out and set exit code; avoid closing browser from the timer (causes races).
    timedOut = true;
    process.exitCode = 2;
  }, overallTimeout);

  browser = await chromium.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();
  await installSelectorGuard(page);
  attachLoggers(page, { withLocations: true });

  try {
    // Give navigation a finite timeout to avoid hanging on slow loads.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });

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

    // Capture a pre-click snapshot for diagnosis
    const preSnap = await getBattleSnapshot(page).catch(() => null);
    console.log("PRE CLICK SNAP", JSON.stringify(preSnap, null, 2));

    // Attempt to click chosen stat (longer click timeout to tolerate slow render)
    const clickRes = await tryClickStat(page, stat, { force: forceClick, timeout: 3000 });

    console.log("CLICK", stat, JSON.stringify(clickRes));

    if (!clickRes.ok && !forceClick) {
      const snap = await getBattleSnapshot(page).catch(() => null);

      console.log("DISABLED_STATE", JSON.stringify(snap, null, 2));
      await takeScreenshot(page, disabledShotPath);
      process.exitCode = 1;
      return;
    }

    // Wait for the round to resolve (either resolver completed or guard fired).
    // Some resolution paths use a randomized sleep; prefer waiting for an
    // explicit marker instead of a fixed short timeout to avoid reporting a
    // mid-resolution snapshot.
    try {
      await page.waitForFunction(
        () => {
          try {
            // resolvedAt set by resolveRound when finished
            if (window.__roundDebug && typeof window.__roundDebug.resolvedAt === "number")
              return true;
            // guard outcome set when guard computes outcome
            if (
              typeof window.__guardOutcomeEvent !== "undefined" &&
              window.__guardOutcomeEvent !== null
            )
              return true;
            // state moved out of roundDecision
            if (
              typeof window.__classicBattleState === "string" &&
              window.__classicBattleState !== "roundDecision"
            )
              return true;
            return false;
          } catch {
            return false;
          }
        },
        { timeout: 2000 }
      );
    } catch {
      // fall back to a brief wait so we still capture a snapshot
      try {
        await page.waitForTimeout(200);
      } catch {}
    }

    const snap = await getBattleSnapshot(page).catch(() => null);

    console.log("AFTER CLICK", JSON.stringify(snap, null, 2));

    const debugText = await page.$eval("#debug-output", (el) => el.textContent).catch(() => null);

    console.log("DEBUG PANEL", debugText);

    await takeScreenshot(page, shotPath);
  } catch (err) {
    console.error("ERROR", err);
    process.exitCode = 1;
  } finally {
    // Clear watchdog and close browser if still open. If we timed out, attempt a final screenshot.
    if (timeoutId) clearTimeout(timeoutId);
    if (browser && typeof browser.close === "function") {
      try {
        if (timedOut && page) {
          try {
            await takeScreenshot(
              page,
              "/workspaces/judokon/playwright-battleProgression-timeout.png"
            );
          } catch {}
        }
      } catch {}
      try {
        await browser.close();
      } catch {
        // swallow close errors; nothing else we can do
      }
    }
  }
})();
