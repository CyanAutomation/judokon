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

async function performStatSelectionFlow(testApi, { orchestrated = false } = {}) {
  const { state, inspect, engine, init: initApi } = testApi;
  const ensureStore = () => {
    const currentStore = getBattleStore();
    expect(currentStore).toBeTruthy();
    expect(currentStore).toBe(inspect.getBattleStore());
    return currentStore;
  };

  // Wait for battle to be ready before dispatching events
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

  // Get round buttons and click first one - modal click handlers will call startRound()
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

  // ===== HYBRID APPROACH: Manually call selectStat() =====
  // This approach works around JSDOM event delegation limitations by calling the
  // internal selection handler directly. The selectStat() function is normally invoked
  // by the stat button click handler, but JSDOM doesn't reliably delegate click events
  // to dynamically rendered buttons. By calling it directly, we simulate the effect
  // of clicking a stat button and trigger the full event emission chain, which updates
  // the store and dispatches the state machine event.
  //
  // This is test-specific code: in production, stat buttons are clicked by the user,
  // which triggers the normal event handler flow. Tests use this direct call because
  // JSDOM's event propagation is unreliable for this use case.

  // Get first stat button to determine which stat to select
  const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
  expect(statButtons.length).toBeGreaterThan(0);
  const selectedStat = statButtons[0].dataset.stat;
  expect(selectedStat).toBeTruthy();

  // Call selectStat directly - this invokes the full selection flow:
  // selectStat() → handleStatSelection() → validateAndApplySelection() → applySelectionToStore()
  // The chain updates store.selectionMade = true and store.playerChoice = stat,
  // and also emits the "statSelected" battle event which dispatches to the state machine

  // Add test ID to store for debugging
  if (store && typeof store === "object") {
    store.__testId = "test-" + Date.now();
  }

  try {
    // selectStat now returns a promise that resolves when selection is complete
    // Don't mute console here - we need to see the logging chain for diagnostics
    await selectStat(store, selectedStat);
  } catch (error) {
    throw new Error(`selectStat failed: ${error?.message}`);
  }

  console.log("Validate selection history:", window.__VALIDATE_SELECTION_DEBUG);
  console.log("Validate selection last:", window.__VALIDATE_SELECTION_LAST);
  expect(window.__VALIDATE_SELECTION_LAST?.current).toBe("waitingForPlayerAction");

  // After selectStat completes, store should have selectionMade = true
  store = ensureStore();
  expect(store.selectionMade).toBe(true);
  expect(store.playerChoice).toBe(selectedStat);

  // Now wait for the state machine to transition to roundDecision and execute
  // its onEnter handler, which calls resolveSelectionIfPresent() and then resolveRound()
  // which eventually calls evaluateOutcome() to update roundsPlayed
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
