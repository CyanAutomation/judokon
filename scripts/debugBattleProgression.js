import { chromium } from "playwright";

(async function run() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true
  });
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
      } catch (e) {}
    })();`
  });
  page.on("console", (m) => console.log("PAGE LOG>", m.type(), m.text()));
  try {
    await page.goto("http://localhost:5000/src/pages/battleJudoka.html?autostart=1");
    console.log("TITLE", await page.title());

    // Wait for machine to initialize
    await page.waitForFunction(() => typeof window.__classicBattleState !== "undefined", {
      timeout: 10000
    });
    console.log("MACHINE STATE", await page.evaluate(() => window.__classicBattleState));

    await page.waitForSelector("#stat-buttons");
    await page.waitForFunction(
      () => document.querySelectorAll("#stat-buttons button").length >= 5,
      { timeout: 5000 }
    );
    const names = await page.$$eval("#stat-buttons button", (els) =>
      els.map((b) => ({ text: b.textContent, stat: b.dataset.stat, disabled: b.disabled }))
    );
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

    // Click the power button, but only after it's enabled. If it stays disabled, capture state and screenshot.
    const powerSelector = '#stat-buttons button[data-stat="power"]';
    const isDisabled = await page.$eval(powerSelector, (b) => b.disabled).catch(() => true);
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
      console.log("Power button is disabled — waiting up to 5s for it to become enabled");
      try {
        await page.waitForFunction(
          (sel) => {
            const el = document.querySelector(sel);
            return el && !el.disabled;
          },
          powerSelector,
          { timeout: 5000 }
        );
      } catch {
        console.log(
          "Power button still disabled after timeout — collecting debug state and screenshot"
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
    }

    // Attempt click if enabled now
    try {
      await page.click(powerSelector);
      console.log("CLICKED POWER");
    } catch (err) {
      console.error("CLICK FAILED", String(err));
    }

    // Wait for orchestrator guard / resolution to run
    await page.waitForTimeout(1600);

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
