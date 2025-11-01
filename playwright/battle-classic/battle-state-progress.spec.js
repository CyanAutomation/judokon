import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";
import { waitForBattleReady, waitForBattleState } from "../helpers/battleStateHelper.js";
import { completeRoundViaApi } from "../helpers/battleApiHelper.js";
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

      await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

      const mappingSnapshot = await page.evaluate(async () => {
        const list = document.getElementById("battle-state-progress");
        if (!list) return null;
        const mod = await import("../helpers/battleStateProgress.js");
        mod.updateActiveState(list, "interruptRound");
        const cooldownItem = list.querySelector('li[data-state="cooldown"]');
        const mappedAttr = cooldownItem?.getAttribute("data-feature-battle-state-active") ?? null;
        const roundModificationItem = list.querySelector('li[data-state="roundDecision"]');
        mod.updateActiveState(list, "roundModification");
        const remappedRound = roundModificationItem?.getAttribute(
          "data-feature-battle-state-active"
        );
        return {
          active: list.getAttribute("data-feature-battle-state-active"),
          original: list.getAttribute("data-feature-battle-state-active-original"),
          cooldownMarker: mappedAttr,
          remappedRound
        };
      });

      expect(mappingSnapshot).not.toBeNull();
      expect(mappingSnapshot?.active).toBe("roundDecision");
      expect(mappingSnapshot?.original).toBe("roundModification");
      expect(mappingSnapshot?.cooldownMarker).toBe("true");
      expect(mappingSnapshot?.remappedRound).toBe("true");
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

      await triggerAutoSelect(page);

      await expect
        .poll(async () => progress.getAttribute("data-feature-battle-state-active-original"))
        .toBe("roundDecision");

      await waitForBattleState(page, "roundOver", { timeout: 10_000 });

      await expect(progress).toHaveAttribute("data-feature-battle-state-active", "roundOver");
      await expect(progress).toHaveAttribute(
        "data-feature-battle-state-active-original",
        "roundOver"
      );
      await expect(progress.locator('li[data-feature-battle-state-active="true"]')).toHaveCount(1);
    }, ["log", "info", "warn", "error", "debug"]));
});
