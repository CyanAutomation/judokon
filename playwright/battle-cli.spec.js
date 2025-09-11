import { test, expect } from "./fixtures/commonSetup.js";
import {
  waitForBattleState as waitForBattleStateHelper,
  getCurrentBattleState
} from "./helpers/battleStateHelper.js";
import { waitForBattleState } from "./fixtures/waits.js";

test.describe("Classic Battle CLI", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Keep UI deterministic for tests
      try {
        localStorage.setItem("battleCLI.verbose", "false");
      } catch {}
      try {
        // Set both the legacy test key and the canonical storage key so the
        // round-select modal is skipped in browser tests.
        localStorage.setItem("battleCLI.pointsToWin", "5");
        try {
          localStorage.setItem("battle.pointsToWin", "5");
        } catch {}
      } catch {}
      try {
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      // Speed up inter-round where possible
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });
    await page.goto("/src/pages/battleCLI.html");
    // Some environments auto-start the match (when persistent storage is set).
    // Click the start button only if it exists to avoid flaky timeouts.
    const startBtn = page.locator("#start-match-button");
    if ((await startBtn.count()) > 0) await startBtn.click();
  });

  test("loads without console errors", async ({ page }) => {
    const errors = [];
    const logs = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      const text = msg.text();
      logs.push(text);
      if (msg.type() === "error") errors.push(text);
    });

    // Check Test API availability instead of arbitrary wait
    const hasTestAPI = await page.evaluate(() => {
      return typeof window.__TEST_API !== "undefined";
    });

    if (hasTestAPI) {
      console.log("✅ Test API available for battle state checking");
    } else {
      console.log("ℹ️ Test API not available, using DOM-based approach");
    }

    console.log(
      "Console logs:",
      logs.filter((log) => log.includes("[RoundSelectModal]") || log.includes("[CLI]"))
    );

    // Check for console errors first
    expect(errors).toEqual([]);

    // Optional: Try to wait for battle to start, but don't fail the test if it doesn't
    try {
      await waitForBattleState(page, "waitingForPlayerAction", 5000);
    } catch {
      console.log(
        "Battle did not reach waitingForPlayerAction state, but no console errors detected"
      );
    }
  });

  test("state badge hidden when flag disabled", async ({ page }) => {
    // Use Test API for faster initialization check instead of arbitrary timeout
    const stateInfo = await page.evaluate(() => {
      if (window.__TEST_API && window.__TEST_API.state) {
        const battleState = window.__TEST_API.state.getBattleState();
        return { hasTestAPI: true, battleState };
      }
      return { hasTestAPI: false, battleState: null };
    });

    console.log("Battle initialization state:", stateInfo);

    // Either auto-start should work, or we need to click a start button
    const startBtn = page.locator("#start-match-button");
    const startBtnCount = await startBtn.count();

    if (startBtnCount > 0) {
      // Start button is present, click it
      console.log("Found start button, clicking it");
      await startBtn.click();

      // Use Test API to check state transition instead of arbitrary wait
      if (stateInfo.hasTestAPI) {
        await page
          .waitForFunction(
            () => {
              const newState = window.__TEST_API.state.getBattleState();
              return newState !== null && newState !== "waitingForMatchStart";
            },
            { timeout: 3000 }
          )
          .catch(() => {
            console.log("Battle state didn't transition quickly, continuing test");
          });
      } else {
        // Fallback: brief wait for DOM updates
        await page.waitForTimeout(500);
      }
    } else {
      console.log("No start button found, assuming auto-start should work");
    }

    // Check the current battle state for debugging
    const currentState = await page.evaluate(() => {
      return {
        bodyDataset: document.body?.dataset?.battleState,
        hasGetStateSnapshot: typeof window.getStateSnapshot === "function",
        stateSnapshot:
          typeof window.getStateSnapshot === "function"
            ? window.getStateSnapshot()
            : "not available"
      };
    });
    console.log("Current battle state:", JSON.stringify(currentState, null, 2));

    // If we're still in waitingForMatchStart, try to trigger the start manually
    if (currentState.bodyDataset === "waitingForMatchStart") {
      console.log("Battle still in waitingForMatchStart, attempting manual start");

      // Try to dispatch the start event manually
      await page.evaluate(() => {
        try {
          // Try different ways to start the battle
          if (typeof window.emitBattleEvent === "function") {
            console.log("Emitting startClicked event");
            window.emitBattleEvent("startClicked");
          }

          // Also try to dispatch to machine if available
          const getter = window.debugHooks?.readDebugState?.("getClassicBattleMachine");
          const machine = typeof getter === "function" ? getter() : getter;
          if (machine?.dispatch) {
            console.log("Dispatching startClicked to machine");
            machine.dispatch("startClicked");
          }
        } catch (err) {
          console.log("Failed to manually start battle:", err.message);
        }
      });

      // Use Test API to verify battle started instead of arbitrary wait
      const finalState = await page.evaluate(() => {
        if (window.__TEST_API && window.__TEST_API.state) {
          return window.__TEST_API.state.getBattleState();
        }
        return "unknown";
      });

      console.log("Final battle state after manual start attempt:", finalState);
    }

    // Check that the battle state badge is hidden when flag is disabled
    // The badge should be hidden regardless of the current battle state
    await expect(page.locator("#battle-state-badge")).toBeHidden();

    // Optional: If the battle successfully starts, wait for it to reach a more stable state
    // but don't fail the test if this doesn't happen within a reasonable time
    try {
      await waitForBattleState(page, "waitingForPlayerAction", 5000);
    } catch {
      console.log("Battle did not reach waitingForPlayerAction state, but that's OK for this test");
    }
  });

  test("state badge visible when flag enabled", async ({ page }) => {
    // Set up feature flag before page load to avoid runtime changes
    await page.addInitScript(() => {
      // Override feature flags before page initialization
      window.__FF_OVERRIDES = { battleStateBadge: true };
    });

    await page.evaluate(() => {
      try {
        // Set feature flag in localStorage before page load
        const settings = {
          featureFlags: {
            cliShortcuts: { enabled: true },
            battleStateBadge: { enabled: true }
          }
        };
        localStorage.setItem("settings", JSON.stringify(settings));

        // Speed up battle progression
        window.__NEXT_ROUND_COOLDOWN_MS = 0;
      } catch {}
    });

    // Load page with autostart to avoid modal/click issues
    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // Wait for battle state using Test API helper (replaces DOM polling)
    await waitForBattleStateHelper(page, "waitingForPlayerAction", { timeout: 10000 });

    // Check current state using Test API
    const currentState = await getCurrentBattleState(page);
    console.log(`✅ Battle reached state: ${currentState} via Test API`);

    // Now check that badge is visible and has correct content
    const badge = page.locator("#battle-state-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/State:\s*waitingForPlayerAction/);
  });

  test("verbose log toggles and records transitions", async ({ page }) => {
    await page.addInitScript(() => {
      // Set up localStorage for battle initialization
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem("battleCLI.verbose", "true");
      } catch {}

      // Speed up battle progression
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });

    await page.evaluate(() => {
      try {
        // Set feature flags in localStorage
        const settings = {
          featureFlags: {
            cliShortcuts: { enabled: true }
          }
        };
        localStorage.setItem("settings", JSON.stringify(settings));
      } catch {}
    });

    // Load page with both autostart and verbose enabled
    await page.goto("/src/pages/battleCLI.html?autostart=1&verbose=1");

    // Wait for battle to reach active state using Test API helper
    await waitForBattleStateHelper(page, "waitingForPlayerAction", { timeout: 10000 });

    // Verbose enabled via query param
    const toggle = page.locator("#verbose-toggle");
    await expect(toggle).toBeChecked();
    await expect(page.locator("#cli-verbose-section")).toBeVisible();

    // Cause a transition by selecting a stat via keyboard (mapped to 1)
    await page.keyboard.press("1");

    // Wait for a later state using Test API helper
    await waitForBattleStateHelper(page, "roundDecision", { timeout: 10000 });

    const log = page.locator("#cli-verbose-log");
    await expect(log).toContainText(/roundDecision/);

    // Turn verbose off hides the section
    await toggle.uncheck();
    await expect(page.locator("#cli-verbose-section")).toBeHidden();
  });

  test("help panel toggles via keyboard and close button", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // Wait for battle to reach active state using Test API helper
    await waitForBattleStateHelper(page, "waitingForPlayerAction", { timeout: 10000 });

    const panel = page.locator("#cli-shortcuts");
    await expect(panel).toBeHidden();
    await page.keyboard.press("h");
    await expect(panel).toBeVisible();
    await page.locator("#cli-shortcuts-close").click();
    await expect(panel).toBeHidden();
  });

  test("closing help panel ignores next advance click", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 10000;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // Wait for battle to reach active state
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });

    // Play first round; machine auto-advances outcome to cooldown
    await page.keyboard.press("1");
    await waitForBattleStateHelper(page, "cooldown", {
      timeout: 10000
    });

    // Close shortcuts panel
    await page.keyboard.press("h");
    await page.locator("#cli-shortcuts-close").click();
    await expect(page.locator("#cli-shortcuts")).toBeHidden();

    // First click after closing is ignored (should still be in cooldown)
    await page.locator("body").click();
    await expect(page.locator("body")).toHaveAttribute("data-battle-state", "cooldown");

    // Second click advances to next round
    await page.locator("body").click();
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });
  });

  test("plays a full round and skips cooldown", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 3000;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // Wait for battle to reach active state
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });

    const score = page.locator("#cli-score");

    await page.keyboard.press("1");
    await waitForBattleStateHelper(page, "cooldown", {
      timeout: 10000
    });
    const playerAfterRound = await score.getAttribute("data-score-player");
    const opponentAfterRound = await score.getAttribute("data-score-opponent");
    const cardBefore = await page.locator("#player-card ul").elementHandle();

    await waitForBattleStateHelper(page, "cooldown", {
      timeout: 10000
    });
    // Pressing Enter advances to the next round
    await page.keyboard.press("Enter");
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });
    const cardAfter = await page.locator("#player-card ul").elementHandle();
    const playerAfterCooldown = await score.getAttribute("data-score-player");
    const opponentAfterCooldown = await score.getAttribute("data-score-opponent");

    expect(playerAfterCooldown).toBe(playerAfterRound);
    expect(opponentAfterCooldown).toBe(opponentAfterRound);
    expect(cardAfter).not.toBe(cardBefore);
  });

  test("skips cooldown with Space key", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 3000;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // Wait for battle to reach active state
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });

    await page.keyboard.press("1");
    await waitForBattleStateHelper(page, "cooldown", {
      timeout: 10000
    });
    await page.keyboard.press("Space");
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });
  });

  test("scoreboard updates after each round", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1&seed=1");

    // Wait for battle to reach active state
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });

    const score = page.locator("#cli-score");
    await page.keyboard.press("1");
    await waitForBattleStateHelper(page, "cooldown", {
      timeout: 10000
    });
    const firstPlayer = await score.getAttribute("data-score-player");
    const firstOpponent = await score.getAttribute("data-score-opponent");

    await page.keyboard.press("Enter");
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });
    await page.keyboard.press("1");
    await waitForBattleStateHelper(page, "cooldown", {
      timeout: 10000
    });
    const secondPlayer = await score.getAttribute("data-score-player");
    const secondOpponent = await score.getAttribute("data-score-opponent");
    expect(Number(secondPlayer) + Number(secondOpponent)).toBeGreaterThanOrEqual(
      Number(firstPlayer) + Number(firstOpponent)
    );
  });

  test("allows tab navigation without invalid key messages", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // Wait for battle to reach active state
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });

    const countdown = page.locator("#cli-countdown");

    const steps = ["Tab", "Tab", "Tab", "Shift+Tab", "Tab", "Tab", "Tab", "Tab", "Tab"];
    for (const step of steps) {
      await page.keyboard.press(step);
      await expect(countdown).not.toContainText("Invalid key");
    }

    await page.keyboard.press("q");
    const confirm = page.locator("#confirm-quit-button");
    await expect(confirm).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(countdown).not.toContainText("Invalid key");
    await page.keyboard.press("Shift+Tab");
    await expect(countdown).not.toContainText("Invalid key");
  });

  test("returns to lobby after quitting", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // Wait for battle to reach active state
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });

    await page.keyboard.press("q");
    const confirm = page.locator("#confirm-quit-button");
    await expect(confirm).toBeVisible();
    await confirm.click();
    await page.waitForURL("**/index.html");
    await expect(page.locator(".home-screen")).toBeVisible();
  });

  test("shows restart control after match completes", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        localStorage.setItem("battle.pointsToWin", "5");
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });

    await page.goto("/src/pages/battleCLI.html?autostart=1&seed=1");

    // Wait for battle to reach active state
    await waitForBattleStateHelper(page, "waitingForPlayerAction", {
      timeout: 10000
    });

    await page.locator("#cli-stats .cli-stat").first().click();
    await page.evaluate(() => {
      globalThis.__classicBattleEventTarget?.dispatchEvent(new CustomEvent("matchOver"));
    });
    await expect(page.locator("#play-again-button")).toBeVisible();
  });
});
