import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import { waitForBattleReady, waitForBattleState } from "../helpers/battleStateHelper.js";
import { completeRoundViaApi, dispatchBattleEvent } from "../helpers/battleApiHelper.js";

import { triggerAutoSelect } from "../helpers/autoSelectHelper.js";

test.describe("Battle state progress list", () => {
  test("renders and updates when the feature flag is enabled", async ({ page }) =>
    withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = {
          battleStateProgress: true,
          showRoundSelectModal: true
        };
      });

      await page.goto("/src/pages/battleClassic.html");

      // Start the round via the modal so the battle flow kicks in.
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons to be ready so the match has fully initialised.
      const statContainer = page.getByTestId("stat-buttons");
      await expect(statContainer).toHaveAttribute("data-buttons-ready", "true");

      const progress = page.getByTestId("battle-state-progress");
      const flagValue = await page.evaluate(() =>
        import("../helpers/featureFlags.js").then((mod) => mod.isEnabled("battleStateProgress"))
      );
      await expect(flagValue, "battleStateProgress flag should be enabled").toBe(true);

      await page.evaluate(() =>
        import("../helpers/battleStateProgress.js").then((mod) => mod.initBattleStateProgress())
      );

      await expect
        .poll(async () => {
          return await page.evaluate(() => {
            const list = document.getElementById("battle-state-progress");
            if (!list) return -2;
            if (!list.classList.contains("ready")) return -1;
            return list.children.length;
          });
        })
        .toBeGreaterThan(0);

      const visibilitySnapshot = await page.evaluate(() => {
        const list = document.getElementById("battle-state-progress");
        if (!list) {
          return { exists: false };
        }
        const rect = list.getBoundingClientRect();
        return {
          exists: true,
          display: getComputedStyle(list).display,
          visibility: getComputedStyle(list).visibility,
          opacity: getComputedStyle(list).opacity,
          width: rect.width,
          height: rect.height,
          parentHidden: !!list.closest("[hidden]")
        };
      });
      await expect(visibilitySnapshot.exists).toBe(true);
      await expect(visibilitySnapshot.display).toBe("flex");
      await expect(visibilitySnapshot.visibility).toBe("visible");
      await expect(Number(visibilitySnapshot.opacity)).toBeGreaterThan(0);
      await expect(visibilitySnapshot.width).toBeGreaterThan(0);
      await expect(visibilitySnapshot.height).toBeGreaterThan(0);
      await expect(visibilitySnapshot.parentHidden).toBe(false);

      await expect(progress).toBeVisible();

      const debugBefore = await page.evaluate(() => {
        const list = document.getElementById("battle-state-progress");
        return {
          exists: !!list,
          childCount: list ? list.children.length : 0,
          display: list ? getComputedStyle(list).display : "missing"
        };
      });
      await expect(debugBefore.exists).toBe(true);
      await expect(
        debugBefore.childCount,
        "progress list should render state items"
      ).toBeGreaterThan(0);

      const items = progress.locator("li");
      const totalStates = await items.count();
      expect(totalStates).toBeGreaterThan(5);

      await expect(items.first()).toHaveAttribute("data-state", "waitingForMatchStart");
    }, ["log", "info", "warn", "error", "debug"]));

  test("reflects active state transitions through a round", async ({ page }) =>
    withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = {
          battleStateProgress: true,
          showRoundSelectModal: true,
          skipRoundCooldown: true
        };
      });

      await page.goto("/src/pages/battleClassic.html");

      // Start a match via the modal to exercise the full battle loop.
      await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
      await page.getByRole("button", { name: "Quick" }).click();

      await waitForBattleReady(page, { timeout: 10_000 });

      const progress = page.getByTestId("battle-state-progress");

      await expect
        .poll(async () => progress.getAttribute("data-feature-battle-state-ready"))
        .toBe("true");

      // Initial state should be tracked on the list and a single item marked active.
      await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

      await expect(progress).toHaveAttribute(
        "data-feature-battle-state-active",
        "waitingForPlayerAction"
      );
      await expect(progress).toHaveAttribute(
        "data-feature-battle-state-active-original",
        "waitingForPlayerAction"
      );
      await expect(progress.locator('li[data-feature-battle-state-active="true"]')).toHaveCount(1);

      // Select the first stat to drive the round forward.
      await page.getByTestId("stat-button").first().click();

      await waitForBattleState(page, "roundDecision", { timeout: 7_500 });
      await expect(progress).toHaveAttribute("data-feature-battle-state-active", "roundDecision");
      await expect(progress.locator('li[data-state="roundDecision"]')).toHaveAttribute(
        "data-feature-battle-state-active",
        "true"
      );

      // Complete the round deterministically and verify the progress list tracks the outcome.
      const completion = await completeRoundViaApi(page, {
        options: { opponentResolveDelayMs: 0, expireSelection: false }
      });
      expect(completion.ok).toBe(true);

      // The finalState should be a post-round state (roundOver, cooldown, matchDecision, or matchOver)
      const finalState = completion.finalState;
      expect(finalState).toBeTruthy();

      // Wait for the final state
      await waitForBattleState(page, finalState, { timeout: 7_500 });

      // Progress list should show the current final state as active
      await expect(progress).toHaveAttribute("data-feature-battle-state-active", finalState);

      // Verify that roundOver list item exists (whether we ended in roundOver or transitioned through it)
      await expect(progress.locator('li[data-state="roundOver"]')).toBeVisible();
    }, ["log", "info", "warn", "error", "debug"]));

  test("remaps interrupt states to core progress markers", async ({ page }) =>
    withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = {
          battleStateProgress: true,
          showRoundSelectModal: true,
          skipRoundCooldown: true
        };
      });

      await page.goto("/src/pages/battleClassic.html");

      await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
      await page.getByRole("button", { name: "Quick" }).click();

      await waitForBattleReady(page, { timeout: 10_000 });

      const progress = page.getByTestId("battle-state-progress");
      await expect
        .poll(async () => progress.getAttribute("data-feature-battle-state-ready"))
        .toBe("true");

      await page.evaluate(() => {
        const list = document.getElementById("battle-state-progress");
        if (!list) return;

        if (window.__progressHistoryObserver) {
          try {
            window.__progressHistoryObserver.disconnect();
          } catch {}
          delete window.__progressHistoryObserver;
        }
        if (window.__progressHistory) {
          delete window.__progressHistory;
        }

        const history = [];
        const recordSnapshot = () => {
          history.push({
            active: list.getAttribute("data-feature-battle-state-active"),
            original: list.getAttribute("data-feature-battle-state-active-original")
          });
        };

        recordSnapshot();

        const observer = new MutationObserver((mutations) => {
          if (
            mutations.some(
              (mutation) =>
                mutation.attributeName === "data-feature-battle-state-active" ||
                mutation.attributeName === "data-feature-battle-state-active-original"
            )
          ) {
            recordSnapshot();
          }
        });

        observer.observe(list, {
          attributes: true,
          attributeFilter: [
            "data-feature-battle-state-active",
            "data-feature-battle-state-active-original"
          ]
        });

        window.__progressHistory = history;
        window.__progressHistoryObserver = observer;
      });

      await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

      const interruptResult = await dispatchBattleEvent(page, "interrupt", { reason: "pause" });
      expect(interruptResult.ok).toBe(true);

      // Accept any valid post-round state (handles skipRoundCooldown flag)
      await waitForBattleState(page, ["cooldown", "roundStart", "waitingForPlayerAction"], {
        timeout: 7_500
      });
      await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

      const adminInterrupt = await dispatchBattleEvent(page, "interrupt", {
        reason: "admin review",
        adminTest: true,
        modification: "score adjusted"
      });
      expect(adminInterrupt.ok).toBe(true);

      const progressHistory = await page.evaluate(() => {
        let snapshot = [];
        try {
          if (window.__progressHistoryObserver) {
            try {
              window.__progressHistoryObserver.disconnect();
            } catch {}
            delete window.__progressHistoryObserver;
          }
        } catch {}

        try {
          snapshot = Array.isArray(window.__progressHistory) ? [...window.__progressHistory] : [];
        } catch {}

        try {
          delete window.__progressHistory;
        } catch {}

        return snapshot;
      });

      const sawInterruptRemap =
        Array.isArray(progressHistory) &&
        progressHistory.some(
          (entry) => entry?.active === "cooldown" && entry?.original === "interruptRound"
        );
      expect(sawInterruptRemap).toBe(true);

      const sawModificationRemap =
        Array.isArray(progressHistory) &&
        progressHistory.some(
          (entry) => entry?.active === "roundDecision" && entry?.original === "roundModification"
        );
      expect(sawModificationRemap).toBe(true);

      await expect(progress.locator('li[data-state="interruptRound"]')).toHaveCount(0);
    }, ["log", "info", "warn", "error", "debug"]));

  test("updates progress when auto-select resolves a stalled selection", async ({ page }) =>
    withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = {
          battleStateProgress: true,
          showRoundSelectModal: true,
          autoSelect: true
        };
        // Set resolve delay to 0 for faster test execution
        window.__OPPONENT_RESOLVE_DELAY_MS = 0;
        // Disable autoContinue so roundOver state is observable
        window.__AUTO_CONTINUE = false;
      });

      await page.goto("/src/pages/battleClassic.html");
      await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
      await page.getByRole("button", { name: "Quick" }).click();

      await waitForBattleReady(page, { timeout: 10_000 });

      const progress = page.getByTestId("battle-state-progress");
      await expect
        .poll(async () => progress.getAttribute("data-feature-battle-state-ready"))
        .toBe("true");

      await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

      const result = await triggerAutoSelect(page, 10_000);
      if (!result.success) {
        throw new Error(`Failed to trigger auto-select: ${result.error}`);
      }

      // After triggerAutoSelect with the fix, the state should transition
      // from waitingForPlayerAction -> roundDecision (via statSelected from auto-select)
      // -> roundOver (via outcome event from roundDecision onEnter actions).
      // With autoContinue disabled, roundOver will be stable and observable.
      await waitForBattleState(page, "roundOver", { timeout: 10_000 });

      // Verify the progress list tracked the transition to roundOver
      await expect(progress).toHaveAttribute("data-feature-battle-state-active", "roundOver");
      await expect(progress).toHaveAttribute(
        "data-feature-battle-state-active-original",
        "roundOver"
      );
      await expect(progress.locator('li[data-feature-battle-state-active="true"]')).toHaveCount(1);
    }, ["log", "info", "warn", "error", "debug"]));
});
