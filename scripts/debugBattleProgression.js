import { chromium } from "playwright";

(async function run() {
  // Prefer an explicit chrome path via env var if provided (useful in CI or devcontainers).
  // Otherwise, omit executablePath to let Playwright use its bundled browser.
  const launchOptions = { headless: true };
  if (process.env.GOOGLE_CHROME_PATH) {
    launchOptions.executablePath = process.env.GOOGLE_CHROME_PATH;
  }
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  // Install an init script that wraps querySelector to catch non-string selectors early
  await page.addInitScript({
    content: `(() => {
      try {
        const wrap = (orig, where) => function(sel) {
          try {
            if (typeof sel !== 'string') {
              try {
                window.__classicBattleQuerySelectorError = {
                  selector: sel,
                  where,
                  stack: (new Error()).stack
                };
              } catch {}
            }
          } catch {}
          return orig.call(this, sel);
        };
        if (Document && Document.prototype && Document.prototype.querySelector) {
          Document.prototype.querySelector = wrap(Document.prototype.querySelector, 'Document.querySelector');
        }
        if (Element && Element.prototype && Element.prototype.querySelector) {
          Element.prototype.querySelector = wrap(Element.prototype.querySelector, 'Element.querySelector');
        }
      } catch {}
    })();`
  });
  page.on("console", (m) => console.log("PAGE LOG>", m.type(), m.text()));
  try {
    await page.goto("http://localhost:5000/src/pages/battleJudoka.html?autostart=1");
    console.log("TITLE", await page.title());

    // Prefer direct debug helpers when available so we don't need long waits.
    const machineInfo = await page.evaluate(() => {
      try {
        // Common newly-added helpers (try them in order).
        if (typeof window.__getBattleSnapshot === "function") {
          return { helper: "__getBattleSnapshot", value: window.__getBattleSnapshot() };
        }
        if (typeof window.getBattleSnapshot === "function") {
          return { helper: "getBattleSnapshot", value: window.getBattleSnapshot() };
        }
        // Fallback to reading the classic state object directly.
        if (typeof window.__classicBattleState !== "undefined") {
          return { helper: "__classicBattleState", value: window.__classicBattleState };
        }
      } catch {}
      return null;
    });
    if (machineInfo) {
      console.log("MACHINE INFO (immediate):", machineInfo.helper, machineInfo.value);
    } else {
      // Short fallback: wait briefly for initialization but avoid long blocking waits
      try {
        await page.waitForFunction(() => typeof window.__classicBattleState !== "undefined", {
          timeout: 2000
        });
        console.log(
          "MACHINE STATE (after short wait)",
          await page.evaluate(() => window.__classicBattleState)
        );
      } catch {
        console.log("MACHINE STATE not available immediately");
      }
    }

    // Attempt to read stat buttons immediately; fall back to a short wait only if none found.
    let names = await page
      .$$eval("#stat-buttons button", (els) =>
        els.map((b) => ({ text: b.textContent, stat: b.dataset.stat, disabled: b.disabled }))
      )
      .catch(() => []);
    if (!names || names.length === 0) {
      try {
        await page.waitForSelector("#stat-buttons", { timeout: 1500 });
        names = await page.$$eval("#stat-buttons button", (els) =>
          els.map((b) => ({ text: b.textContent, stat: b.dataset.stat, disabled: b.disabled }))
        );
      } catch {
        // give up quickly - we prefer immediate inspection flows
        console.log("STAT BUTTONS not found quickly");
        names = [];
      }
    }
    console.log("STAT BUTTONS", JSON.stringify(names));

    // Try to pre-seed a playerChoice in the shared store so the guard won't interrupt
    try {
      await page.evaluate(() => {
        try {
          if (window.battleStore && !window.battleStore.playerChoice) {
            window.battleStore.playerChoice = "power";
            window.battleStore.selectionMade = true;
          }
        } catch {}
      });
      console.log('Pre-seeded playerChoice="power" in window.battleStore (if available)');
    } catch {}

    // Improved console logging with location (if available)
    page.on("console", (m) => {
      const loc = typeof m.location === "function" ? m.location() : null;
      console.log(
        "PAGE LOG>",
        m.type(),
        m.text(),
        loc ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : ""
      );
    });

    // Click the power button if present. Prefer immediate check rather than waiting for enablement.
    const powerSelector = '#stat-buttons button[data-stat="power"]';
    const isDisabled = await page
      .$eval(powerSelector, (b) => b.disabled)
      .catch(() => {
        // If the button isn't present, treat as disabled and continue without long waits
        return true;
      });
    // If the machine is in waitingForPlayerAction or roundDecision, try to simulate a player choice
    // by setting the shared store value. This helps bypass headless guard paths that trigger interrupts.
    try {
      const curState = await page.evaluate(() => window.__classicBattleState || null);
      if (curState === "waitingForPlayerAction" || curState === "roundDecision") {
        console.log("Simulating player choice 'power' in battleStore to avoid guard interrupt");
        await page.evaluate(() => {
          try {
            if (window.battleStore && !window.battleStore.playerChoice) {
              window.battleStore.playerChoice = "power";
              window.battleStore.selectionMade = true;
            }
          } catch {}
        });
      }
    } catch {}
    if (isDisabled) {
      console.log(
        "Power button is disabled or missing — skipping long waits and capturing quick snapshot"
      );
      const state = await page.evaluate(() => ({
        state: window.__classicBattleState || null,
        prev: window.__classicBattlePrevState || null,
        lastEvent: window.__classicBattleLastEvent || null,
        lastInterruptReason: window.__classicBattleLastInterruptReason || null,
        lastQuerySelectorError: window.__classicBattleQuerySelectorError || null,
        log: window.__classicBattleStateLog || []
      }));
      console.log("DISABLED_STATE", JSON.stringify(state, null, 2));
      await page
        .screenshot({
          path: "/workspaces/judokon/playwright-battleProgression-disabled.png",
          fullPage: true
        })
        .catch(() => {});
    }

    // Attempt click if enabled now
    try {
      await page.click(powerSelector);
      console.log("CLICKED POWER");
    } catch (err) {
      console.error("CLICK FAILED", String(err));
    }

    // Wait briefly for any orchestrator resolution, but prefer to read guard outcome helpers if present.
    try {
      const guardOutcome = await page.evaluate(() => {
        if (typeof window.__getGuardOutcome === "function") return window.__getGuardOutcome();
        return window.__guardOutcomeEvent || null;
      });
      if (!guardOutcome) {
        // short sleep to let immediate handlers run; keep it tiny to avoid long tests
        await page.waitForTimeout(200);
      }
    } catch {
      await page.waitForTimeout(200);
    }

    const state = await page.evaluate(() => ({
      state: window.__classicBattleState || null,
      prev: window.__classicBattlePrevState || null,
      lastEvent: window.__classicBattleLastEvent || null,
      lastInterruptReason: window.__classicBattleLastInterruptReason || null,
      lastQuerySelectorError: window.__classicBattleQuerySelectorError || null,
      log: window.__classicBattleStateLog || [],
      roundDebug: window.__roundDebug || null,
      guardFiredAt: window.__guardFiredAt || null,
      guardOutcome: window.__guardOutcomeEvent || null,
      store: window.battleStore
        ? {
            selectionMade: window.battleStore.selectionMade,
            playerChoice: window.battleStore.playerChoice
          }
        : null,
      machineTimer: document.getElementById("machine-timer")
        ? {
            remaining: document.getElementById("machine-timer").dataset.remaining,
            paused: document.getElementById("machine-timer").dataset.paused
          }
        : null,
      machineStateEl: document.getElementById("machine-state")
        ? document.getElementById("machine-state").textContent
        : null
    }));
    console.log("AFTER CLICK", JSON.stringify(state, null, 2));

    const debug = await page.$eval("#debug-output", (el) => el.textContent).catch(() => null);
    console.log("DEBUG PANEL", debug);

    await page.screenshot({
      path: "/workspaces/judokon/playwright-battleProgression.png",
      fullPage: true
    });
    console.log("screenshot saved");
  } catch (err) {
    console.error("ERROR", err);
  } finally {
    await browser.close();
  }
})();
