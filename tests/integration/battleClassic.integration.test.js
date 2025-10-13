/**
 * Integration test for the battleClassic page initialization.
 * This test loads the real HTML, runs the initialization script,
 * and asserts the page is in the correct initial state.
 *
 * Test Hooks Documentation:
 * - `initClassicBattleTest({ afterMock: true })`: Helper to reset and ensure Classic Battle bindings after mocks.
 *   Use immediately after vi.doMock() in unit tests.
 * - `window.__FF_OVERRIDES`: Object for overriding feature flags and test behaviors.
 *   Common overrides: { battleStateBadge: true, showRoundSelectModal: true, enableTestMode: true }
 * - `window.battleStore`: The battle state store exposed after successful initialization.
 * - Stat selection buttons: Rendered and enabled for user interaction after init completes.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";
import rounds from "../../src/data/battleRounds.js";
import { getPointsToWin } from "../../src/helpers/battleEngineFacade.js";
import { DEFAULT_POINTS_TO_WIN } from "../../src/config/battleDefaults.js";

describe("Battle Classic Page Integration", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");

    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleClassic.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    // Mock feature flags to ensure a consistent test environment
    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true // Ensure modal is shown for testing
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("initializes the page UI to the correct default state", async () => {
    // Run the main initialization function
    await init();

    // 1. Assert Battle State Badge is correct
    const badge = document.getElementById("battle-state-badge");
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe("Lobby");

    // 2. Assert Scoreboard is in its initial state
    const scoreDisplay = document.getElementById("score-display");
    expect(scoreDisplay.textContent).toContain("You: 0");
    expect(scoreDisplay.textContent).toContain("Opponent: 0");

    const roundCounter = document.getElementById("round-counter");
    expect(roundCounter.textContent).toContain("Round 0");

    // 3. Assert Round Select Modal is visible
    const modalTitle = document.getElementById("round-select-title");
    expect(modalTitle).not.toBeNull();
    expect(modalTitle.textContent).toBe("Select Match Length");

    const modal = document.querySelector(".modal-backdrop");
    expect(modal).not.toBeNull();
    // The modal's open state might be controlled by a class or attribute.
    // Here we assume it's rendered and present in the DOM.
    // A more robust check could be for `modal.classList.contains('open')`
    // if the modal library uses that convention.

    // 4. Assert round select modal renders interactive controls after init
    const roundSelectButtons = Array.from(
      document.querySelectorAll(".round-select-buttons button")
    );
    expect(roundSelectButtons.length).toBeGreaterThan(0);
    roundSelectButtons.forEach((button) => {
      expect(button.disabled).toBe(false);
      const label = button.textContent?.trim() ?? "";
      expect(label).not.toBe("");
      expect(button.dataset.tooltipId).toBe(`ui.round${label}`);
    });

    expect(getPointsToWin()).toBe(DEFAULT_POINTS_TO_WIN);

    const firstOption = roundSelectButtons[0];
    const selectedLabel = firstOption.textContent?.trim();
    if (!selectedLabel) {
      throw new Error("Round select button at index 0 missing label text");
    }
    const selectedRound = rounds.find((round) => round.label === selectedLabel);
    if (!selectedRound) {
      throw new Error(
        `Round configuration missing for label: ${selectedLabel} (available: ${rounds
          .map((round) => round.label)
          .join(", ")})`
      );
    }

    await withMutedConsole(async () => {
      firstOption.click();
    });

    expect(getPointsToWin()).toBe(selectedRound.value);
    expect(document.body.dataset.target).toBe(String(selectedRound.value));
    expect(document.querySelector(".round-select-buttons")).toBeNull();

    // 5. Assert initialization completed successfully
    expect(window.battleStore).toBeDefined();
  });

  it("provides the battle store through the inspect API after init", async () => {
    await init();

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    expect(testApi?.inspect?.getBattleStore).toBeTypeOf("function");

    const inspect = testApi.inspect;
    let store = inspect.getBattleStore();
    expect(store).toBeTruthy();
    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();

    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    await withMutedConsole(async () => {
      roundButtons[0].click();
      await testApi.state.waitForBattleState("waitingForPlayerAction");
    });

    store = inspect.getBattleStore();
    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();

    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);

    const chosenButton = statButtons[0];
    const chosenStat = chosenButton.dataset.stat;
    expect(chosenStat).toBeTruthy();

    const debugBefore = inspect.getDebugInfo();
    const roundsPlayedBefore = debugBefore?.store?.roundsPlayed ?? 0;

    await withMutedConsole(async () => {
      chosenButton.click();
      await testApi.state.waitForBattleState("roundDecision");
    });

    const debugAfter = inspect.getDebugInfo();
    expect(debugAfter?.store?.roundsPlayed ?? 0).toBeGreaterThan(roundsPlayedBefore);

    store = inspect.getBattleStore();
    expect(store).toBeTruthy();
  });

  it("preserves opponent placeholder card structure and accessibility", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();

    const placeholder = opponentCard.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder.classList.contains("card")).toBe(true);
    expect(placeholder.getAttribute("aria-label")).toBe("Mystery opponent card");
  });

  it("upgrades the placeholder card during opponent reveal", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();

    const placeholder = opponentCard.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();

    const framePromise = new Promise((resolve) => {
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });

    await framePromise;

    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    expect(testApi?.state?.waitForBattleState).toBeTypeOf("function");

    let reachedPlayerAction = false;
    await withMutedConsole(async () => {
      roundButtons[0].click();
      reachedPlayerAction = await testApi.state.waitForBattleState("waitingForPlayerAction");
    });
    expect(reachedPlayerAction).toBe(true);

    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);

    const resetOpponentDelay = () => {
      if (typeof testApi?.timers?.setOpponentResolveDelay === "function") {
        testApi.timers.setOpponentResolveDelay(null);
      }
    };

    if (typeof testApi?.timers?.setOpponentResolveDelay === "function") {
      testApi.timers.setOpponentResolveDelay(0);
    }

    let reachedRoundDecision = false;
    try {
      await withMutedConsole(async () => {
        statButtons[0].click();
        reachedRoundDecision = await testApi.state.waitForBattleState("roundDecision");
      });
    } finally {
      resetOpponentDelay();
    }
    expect(reachedRoundDecision).toBe(true);

    await new Promise((resolve) => {
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });

    expect(opponentCard.querySelector("#mystery-card-placeholder")).toBeNull();
    const revealedContainer = opponentCard.querySelector(".card-container");
    expect(revealedContainer).not.toBeNull();
    const revealedCard = revealedContainer?.querySelector(".judoka-card");
    expect(revealedCard).not.toBeNull();
    expect(revealedCard?.getAttribute("aria-label") ?? "").not.toContain("Mystery");
  });
});
