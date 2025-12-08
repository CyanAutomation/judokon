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
 * - `getBattleStore()`: Helper for reading the battle state store via supported accessors after initialization.
 * - Stat selection buttons: Rendered and enabled for user interaction after init completes.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";
import { getBattleStore } from "../utils/battleStoreAccess.js";
import { setupOpponentDelayControl } from "../utils/battleTestUtils.js";
import { resetOrchestratorForTest } from "../../src/helpers/classicBattle/orchestrator.js";
import rounds from "../../src/data/battleRounds.js";
import { getPointsToWin } from "../../src/helpers/battleEngineFacade.js";
import { DEFAULT_POINTS_TO_WIN } from "../../src/config/battleDefaults.js";
import { selectStat } from "../../src/helpers/classicBattle/uiHelpers.js";

/**
 * Perform a complete stat selection flow for testing.
 *
 * This helper:
 * 1. Waits for battle to be ready
 * 2. Selects a round from the modal
 * 3. Waits for player action state
 * 4. Selects a stat and verifies store is updated immediately
 * 5. Waits for round to fully resolve (roundDecision state)
 * 6. Verifies roundsPlayed was incremented
 *
 * @param {object} testApi - Test API from window.__TEST_API
 * @param {object} options - Configuration
 * @param {boolean} [options.orchestrated=false] - Whether to test orchestrated flow
 * @returns {Promise<{store, roundsBefore, roundsAfter, engineRounds}>}
 */
async function performStatSelectionFlow(testApi, { orchestrated = false } = {}) {
  const { state, inspect, engine, init: initApi } = testApi;
  const ensureStore = () => {
    const currentStore = getBattleStore();
    expect(currentStore).toBeTruthy();
    expect(currentStore).toBe(inspect.getBattleStore());
    return currentStore;
  };

  // Step 1: Wait for battle to be ready before dispatching events
  await withMutedConsole(async () => {
    const isReady = await initApi.waitForBattleReady(5000);
    expect(isReady).toBe(true);
  });

  let store = ensureStore();

  if (orchestrated) {
    const marker = document.createElement("div");
    marker.id = "orchestrator-test-marker";
    marker.setAttribute("data-battle-state", "waitingForPlayerAction");
    document.body.appendChild(marker);
  } else {
    document.getElementById("orchestrator-test-marker")?.remove();
  }

  expect(store.selectionMade).toBe(false);
  expect(store.playerChoice).toBeNull();

  const debugBefore = inspect.getDebugInfo();
  const roundsBefore = debugBefore?.store?.roundsPlayed ?? 0;

  // Step 2: Click round button and wait for waitingForPlayerAction state
  const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
  expect(roundButtons.length).toBeGreaterThan(0);

  await withMutedConsole(async () => {
    roundButtons[0].click();
    // Let the modal's button click handler execute and dispatch startClicked
    await Promise.resolve();
    // Wait for state machine to reach waitingForPlayerAction state
    await state.waitForBattleState("waitingForPlayerAction", 5000);
  });

  store = ensureStore();
  expect(store.selectionMade).toBe(false);
  expect(store.playerChoice).toBeNull();

  // Step 3: Get first stat button to determine which stat to select
  const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
  expect(statButtons.length).toBeGreaterThan(0);
  const selectedStat = statButtons[0].dataset.stat;
  expect(selectedStat).toBeTruthy();

  // Step 4: Perform stat selection and verify immediate store update
  // CRITICAL: The store is updated synchronously during selectStat() execution.
  // We need to assert the store state BEFORE awaiting the full selection promise,
  // which includes round resolution and state machine transitions.

  // Disable console logging for the selection call to keep test output clean
  let selectionPromise;
  await withMutedConsole(async () => {
    selectionPromise = selectStat(store, selectedStat);
    // Microtask to allow handleStatSelection to run and update store
    await Promise.resolve();
  });

  // NOW check that store was updated - this happens synchronously in applySelectionToStore
  store = ensureStore();

  // Debug: Check if validation state is available
  const validationDebug = window.__VALIDATE_SELECTION_DEBUG;
  const lastValidation = window.__VALIDATE_SELECTION_LAST;
  if (validationDebug && validationDebug.length > 0) {
    const lastEntry = validationDebug[validationDebug.length - 1];
    if (!lastEntry.allowed) {
      throw new Error(
        `Selection was rejected by validateSelectionState: selectionMade=${lastEntry.selectionMade}, current state=${lastEntry.current}. Last Validation: ${JSON.stringify(lastValidation)}. This likely means the orchestrator is not in "waitingForPlayerAction" state yet. Full debug: ${JSON.stringify(validationDebug)}`
      );
    }
  }

  expect(store.selectionMade).toBe(true);
  expect(store.playerChoice).toBe(selectedStat); // Step 5: Now await the full selection promise to complete the round resolution
  // This ensures the orchestrator state machine transitions and round is fully complete
  try {
    await withMutedConsole(async () => {
      await selectionPromise;
    });
  } catch (error) {
    throw new Error(`selectStat failed: ${error?.message}`);
  }

  // Step 6: Wait for state machine to reach roundDecision and fully resolve the round
  // This transition happens after the selection event is processed and the round outcome
  // is evaluated (which updates roundsPlayed).
  await withMutedConsole(async () => {
    await state.waitForBattleState("roundDecision", 5000);
  });

  const debugAfter = inspect.getDebugInfo();
  const roundsAfter = debugAfter?.store?.roundsPlayed ?? 0;

  return {
    store: ensureStore(),
    roundsBefore,
    roundsAfter,
    engineRounds: engine.getRoundsPlayed()
  };
}

describe("Battle Classic Page Integration", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    // Read HTML file using Node's built-in require to bypass vi.resetModules() issues
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");

    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleClassic.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = window.document;
    globalThis.document = window.document;
    globalThis.window = window;
    global.navigator = window.navigator;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    // Mock fetch to load JSON data files from disk
    global.fetch = vi.fn(async (url) => {
      const fs = require("fs");
      const path = require("path");
      const urlStr = typeof url === "string" ? url : url.toString();

      // Extract relative path from URL (e.g., /src/data/judoka.json)
      const match = urlStr.match(/\/src\/data\/[\w-]+\.json$/);
      if (match) {
        const filePath = path.join(process.cwd(), match[0]);
        const content = fs.readFileSync(filePath, "utf-8");
        return {
          ok: true,
          json: async () => JSON.parse(content),
          text: async () => content
        };
      }

      // Default: return empty array/object for unknown URLs
      return {
        ok: true,
        json: async () => [],
        text: async () => "[]"
      };
    });

    // Also set fetch on the window object
    window.fetch = global.fetch;

    // Mock feature flags to ensure a consistent test environment
    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true, // Ensure modal is shown for testing
      enableTestMode: true // Enable test mode for deterministic timers
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    resetOrchestratorForTest();
    // Note: vi.resetModules() is not used because it clears ALL modules including Node.js built-ins,
    // causing the next test's beforeEach to fail when trying to use fs/path functions
  });

  it("DEBUG: Verify validateSelectionState logs are firing", async () => {
    // Simple test to verify logging is happening
    // Capture logs from init as well
    window.__TEST_CAPTURED_LOGS = [];
    const originalLog = console.log;
    console.log = (...args) => {
      const msg = args.map((a) => String(a)).join(" ");
      window.__TEST_CAPTURED_LOGS.push(msg);
    };

    try {
      await init();
    } finally {
      // Don't restore yet - keep capturing
    }

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();

    // Quietly initialize
    await withMutedConsole(async () => {
      const isReady = await testApi.init.waitForBattleReady(5000);
      expect(isReady).toBe(true);
    });

    // Start a round
    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    await withMutedConsole(async () => {
      roundButtons[0].click();
      await Promise.resolve();
      await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);
    });

    // NOW call selectStat WITHOUT muting so we can see the logs
    const store = testApi.inspect.getBattleStore();
    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);

    try {
      await selectStat(store, statButtons[0].dataset.stat);
    } finally {
      console.log = originalLog;
    }

    // Now check what was captured - SHOW EVERYTHING
    const logs = window.__TEST_CAPTURED_LOGS || [];
    const logSummary = logs.map((log, idx) => `${idx}: ${log}`).join("\n");

    const orchestratorState = window.__ORCHESTRATOR_INITIAL_STATE;
    const initCalled = window.__INIT_ORCHESTRATOR_CALLED;
    const earlyReturnMachine = window.__ORCHESTRATOR_EARLY_RETURN_MACHINE;
    const earlyReturnPromise = window.__ORCHESTRATOR_EARLY_RETURN_PROMISE;
    const startingInit = window.__ORCHESTRATOR_STARTING_INIT;
    const earlyReturnStack = window.__ORCHESTRATOR_EARLY_RETURN_STACK;

    const additionalInfo = `\n\nDiagnostics:\n  Init called: ${initCalled}\n  Early return (machine): ${earlyReturnMachine}\n  Stack: ${earlyReturnStack}\n  Early return (promise): ${earlyReturnPromise}\n  Starting init: ${startingInit}\n  Initial state: ${orchestratorState}`;

    throw new Error(`Captured ${logs.length} total logs:\n${logSummary}${additionalInfo}`);
  });

  it("initializes the page UI to the correct default state", async () => {
    // Run the main initialization function
    await init();

    // Wait for battle to be ready before dispatching events
    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    await withMutedConsole(async () => {
      const isReady = await testApi.init.waitForBattleReady(5000);
      expect(isReady).toBe(true);
    });

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

    const modal = document.querySelector("dialog.modal");
    expect(modal).not.toBeNull();

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

    expect(testApi?.state?.dispatchBattleEvent).toBeTypeOf("function");

    // Click round button - modal's click handler will call startRound()
    await withMutedConsole(async () => {
      firstOption.click();
      // Let event handlers execute
      await Promise.resolve();
    });

    expect(getPointsToWin()).toBe(selectedRound.value);
    expect(document.body.dataset.target).toBe(String(selectedRound.value));
    expect(document.querySelector(".round-select-buttons")).toBeNull();

    // 5. Assert initialization completed successfully via the public accessor
    const store = getBattleStore();
    expect(store).toBeTruthy();
    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
    const debugBefore = testApi.inspect?.getDebugInfo?.() ?? null;
    const roundsBefore = Number(debugBefore?.store?.roundsPlayed ?? store.roundsPlayed ?? 0);

    // 6. Stat buttons should be interactive immediately after initialization
    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);
    statButtons.forEach((button) => {
      expect(button.disabled).toBe(false);
    });

    const selectedButton = statButtons[0];
    const selectedStat = selectedButton.dataset.stat;
    expect(selectedStat).toBeTruthy();

    let resetOpponentDelay = () => {};
    if (typeof testApi?.timers?.setOpponentResolveDelay === "function") {
      testApi.timers.setOpponentResolveDelay(0);
      resetOpponentDelay = () => {
        testApi.timers.setOpponentResolveDelay(null);
      };
    }

    try {
      // Use hybrid approach: call selectStat directly to invoke full event chain
      // selectStat() → handleStatSelection() → validateAndApplySelection() → applySelectionToStore()
      // This works around JSDOM event delegation limitations by calling the selection
      // handler directly, which updates store.selectionMade and store.playerChoice

      // Add test ID to store for debugging
      if (store && typeof store === "object") {
        store.__testId = "test-" + Date.now();
      }

      // DIAGNOSTIC: Before calling selectStat
      const storeBeforeSelection = getBattleStore();
      const storeRefBefore = storeBeforeSelection;
      console.log("[TEST DIAG] Before selectStat:", {
        storeRefSame: storeRefBefore === store,
        selectionMadeBefore: storeBeforeSelection.selectionMade,
        playerChoiceBefore: storeBeforeSelection.playerChoice,
        storeId: storeBeforeSelection?.__testId
      });

      try {
        // selectStat now returns a promise that resolves when selection is complete
        const selectStatPromise = selectStat(store, selectedStat);
        console.log(
          "[TEST DIAG] selectStat returned promise:",
          selectStatPromise instanceof Promise
        );
        await selectStatPromise;
        console.log("[TEST DIAG] selectStat promise resolved");
      } catch (error) {
        throw new Error(`selectStat failed: ${error?.message}`);
      }

      // DIAGNOSTIC: After calling selectStat
      const storeAfterSelection = getBattleStore();
      const storeRefAfter = storeAfterSelection;
      console.log("[TEST DIAG] After selectStat:", {
        storeRefSame: storeRefAfter === store,
        storeRefChanged: storeRefAfter !== storeRefBefore,
        selectionMadeAfter: storeAfterSelection.selectionMade,
        playerChoiceAfter: storeAfterSelection.playerChoice,
        storeId: storeAfterSelection?.__testId
      });

      // DIAGNOSTIC: Check validation debug info
      const validationDebug = window.__VALIDATE_SELECTION_LAST;
      if (validationDebug) {
        console.log("[TEST DIAG] Validation Debug Info:", validationDebug);
      }
      const validationHistory = window.__VALIDATE_SELECTION_DEBUG;
      if (validationHistory && validationHistory.length > 0) {
        console.log("[TEST DIAG] Full Validation History:", validationHistory);
      }

      // Verify store was updated
      expect(store.selectionMade).toBe(true);
      expect(store.playerChoice).toBe(selectedStat);

      // Wait for roundDecision state and its handlers to execute
      await withMutedConsole(async () => {
        await testApi.state.waitForBattleState("roundDecision", 5000);
      });
    } finally {
      resetOpponentDelay();
    }

    const postSelectionStore = getBattleStore();
    expect(postSelectionStore.selectionMade).toBe(true);
    const debugAfter = testApi.inspect?.getDebugInfo?.() ?? null;
    const roundsAfter = Number(
      debugAfter?.store?.roundsPlayed ?? postSelectionStore.roundsPlayed ?? 0
    );
    expect(roundsAfter).toBeGreaterThan(roundsBefore);
    expect(debugAfter?.store?.selectionMade ?? null).toBe(true);
    expect(document.body.dataset.battleState).toBe("roundDecision");
  });

  it("keeps roundsPlayed in sync between engine and store in non-orchestrated flow", async () => {
    await init();

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();

    const result = await performStatSelectionFlow(testApi);
    expect(result.store).toBeTruthy();
    expect(result.roundsAfter).toBeGreaterThan(result.roundsBefore);
    expect(result.engineRounds).toBe(result.roundsAfter);
  });

  it("keeps roundsPlayed in sync between engine and store in orchestrated flow", async () => {
    await init();

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();

    const result = await performStatSelectionFlow(testApi, { orchestrated: true });
    expect(result.store).toBeTruthy();
    expect(result.roundsAfter).toBeGreaterThan(result.roundsBefore);
    expect(result.engineRounds).toBe(result.roundsAfter);
  });

  it("exposes the battle store through the public accessor during a full selection flow", async () => {
    await init();

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();

    const initialStore = getBattleStore();
    expect(initialStore).toBe(testApi.inspect.getBattleStore());
    expect(initialStore.selectionMade).toBe(false);
    expect(initialStore.playerChoice).toBeNull();

    const debugBefore = testApi.inspect.getDebugInfo();
    const roundsBefore = debugBefore?.store?.roundsPlayed ?? 0;

    // Click round button - modal's click handler will call startRound()
    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    await withMutedConsole(async () => {
      roundButtons[0].click();
      // Let event handlers execute
      await Promise.resolve();
      // Wait for orchestrator to reach waitingForPlayerAction state
      await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);
    });

    const updatedStore = getBattleStore();
    expect(updatedStore).toBe(initialStore);
    expect(updatedStore.selectionMade).toBe(false);

    // Use hybrid approach: call selectStat directly
    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);
    const selectedStat = statButtons[0].dataset.stat;

    await withMutedConsole(async () => {
      // selectStat now returns a promise that resolves when selection is complete
      await selectStat(initialStore, selectedStat);
    });

    const postStatStore = getBattleStore();
    expect(postStatStore).toBe(initialStore);
    expect(postStatStore.selectionMade).toBe(true);

    // Wait for roundDecision state
    await withMutedConsole(async () => {
      await testApi.state.waitForBattleState("roundDecision", 5000);
    });

    const debugAfter = testApi.inspect.getDebugInfo();
    const roundsAfter = debugAfter?.store?.roundsPlayed ?? 0;
    expect(debugAfter?.store?.selectionMade).toBe(true);
    expect(roundsAfter).toBeGreaterThan(roundsBefore);
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

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    expect(testApi?.state?.dispatchBattleEvent).toBeTypeOf("function");
    expect(testApi?.state?.waitForRoundsPlayed).toBeTypeOf("function");

    const { resetOpponentDelay, setOpponentDelayToZero } = setupOpponentDelayControl(testApi);
    setOpponentDelayToZero();

    try {
      // Click round button - modal's click handler will dispatch startClicked
      const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
      expect(roundButtons.length).toBeGreaterThan(0);

      await withMutedConsole(async () => {
        roundButtons[0].click();
        await Promise.resolve();
        // Wait for orchestrator to reach waitingForPlayerAction state
        await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);
      });

      // Use hybrid approach: call selectStat directly
      const store = getBattleStore();
      const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
      expect(statButtons.length).toBeGreaterThan(0);
      const selectedStat = statButtons[0].dataset.stat;

      // Dispatch statSelected via selectStat
      await withMutedConsole(async () => {
        await selectStat(store, selectedStat);
      });

      // At this point, opponent card should be obscured with placeholder
      expect(opponentCard?.classList.contains("is-obscured")).toBe(true);
      expect(opponentCard?.querySelector("#mystery-card-placeholder")).not.toBeNull();

      // Wait for roundDecision resolution to complete
      await withMutedConsole(async () => {
        await testApi.state.waitForBattleState("roundDecision", 5000);
      });

      const roundCompleted = await testApi.state.waitForRoundsPlayed(1);
      expect(roundCompleted).toBe(true);

      await new Promise((resolve) => {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => resolve());
        } else {
          setTimeout(resolve, 0);
        }
      });

      expect(opponentCard?.classList.contains("is-obscured")).toBe(false);
      expect(opponentCard.querySelector("#mystery-card-placeholder")).toBeNull();
      const revealedContainer = opponentCard.querySelector(".card-container");
      expect(revealedContainer).not.toBeNull();
      const revealedCard = revealedContainer?.querySelector(".judoka-card");
      expect(revealedCard).not.toBeNull();
      expect(revealedCard?.getAttribute("aria-label") ?? "").not.toContain("Mystery");
    } finally {
      resetOpponentDelay();
    }
  });
});
