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
import rounds from "../../src/data/battleRounds.js";
import { getPointsToWin } from "../../src/helpers/battleEngineFacade.js";
import { DEFAULT_POINTS_TO_WIN } from "../../src/config/battleDefaults.js";

async function performStatSelectionFlow(testApi, { orchestrated = false } = {}) {
  const { inspect, state, engine } = testApi;
  const ensureStore = () => {
    const currentStore = getBattleStore();
    expect(currentStore).toBeTruthy();
    expect(currentStore).toBe(inspect.getBattleStore());
    return currentStore;
  };

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

  const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
  expect(roundButtons.length).toBeGreaterThan(0);

  await withMutedConsole(async () => {
    roundButtons[0].click();
    // Wait for async handlers and requestAnimationFrame to complete
    await new Promise((resolve) => {
      let frameCount = 0;
      const checkFrames = () => {
        frameCount++;
        if (frameCount < 3) {
          if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(checkFrames);
          } else {
            setTimeout(checkFrames, 0);
          }
        } else {
          resolve();
        }
      };
      // Also let promises settle
      Promise.resolve().then(() => {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(checkFrames);
        } else {
          setTimeout(checkFrames, 0);
        }
      });
    });
    // Verify stat buttons appear and are enabled (indicates we reached waitingForPlayerAction state)
    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);
    statButtons.forEach((btn) => {
      expect(btn.disabled).toBe(false);
    });
  });

  store = ensureStore();
  expect(store.selectionMade).toBe(false);
  expect(store.playerChoice).toBeNull();

  const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
  expect(statButtons.length).toBeGreaterThan(0);

  const chosenButton = statButtons[0];
  expect(chosenButton.dataset.stat).toBeTruthy();

  const debugBefore = inspect.getDebugInfo();
  const roundsBefore = debugBefore?.store?.roundsPlayed ?? 0;

  await withMutedConsole(async () => {
    chosenButton.click();
    // Wait for async handlers and requestAnimationFrame to complete after stat selection
    await new Promise((resolve) => {
      let frameCount = 0;
      const checkFrames = () => {
        frameCount++;
        if (frameCount < 5) {
          if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(checkFrames);
          } else {
            setTimeout(checkFrames, 0);
          }
        } else {
          resolve();
        }
      };
      // Also let promises settle
      Promise.resolve().then(() => {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(checkFrames);
        } else {
          setTimeout(checkFrames, 0);
        }
      });
    });
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
    // Note: vi.resetModules() is not used because it clears ALL modules including Node.js built-ins,
    // causing the next test's beforeEach to fail when trying to use fs/path functions
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

    const modal = document.querySelector("dialog.modal");
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

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    expect(testApi?.state?.waitForBattleState).toBeTypeOf("function");

    await withMutedConsole(async () => {
      firstOption.click();
      // Wait for async handlers and requestAnimationFrame to complete
      await new Promise((resolve) => {
        let frameCount = 0;
        const checkFrames = () => {
          frameCount++;
          if (frameCount < 3) {
            if (typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(checkFrames);
            } else {
              setTimeout(checkFrames, 0);
            }
          } else {
            resolve();
          }
        };
        Promise.resolve().then(() => {
          if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(checkFrames);
          } else {
            setTimeout(checkFrames, 0);
          }
        });
      });
      // Verify stat buttons appear and are enabled (indicates we reached waitingForPlayerAction state)
      const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
      expect(statButtons.length).toBeGreaterThan(0);
      statButtons.forEach((btn) => {
        expect(btn.disabled).toBe(false);
      });
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

    let reachedRoundDecision = false;
    let resetOpponentDelay = () => {};
    if (typeof testApi?.timers?.setOpponentResolveDelay === "function") {
      testApi.timers.setOpponentResolveDelay(0);
      resetOpponentDelay = () => {
        testApi.timers.setOpponentResolveDelay(null);
      };
    }

    try {
      await withMutedConsole(async () => {
        selectedButton.click();
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

    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    const debugBefore = testApi.inspect.getDebugInfo();
    const roundsBefore = debugBefore?.store?.roundsPlayed ?? 0;

    // Click round button and verify stat buttons appear
    await withMutedConsole(async () => {
      roundButtons[0].click();
      // Wait for async handlers and requestAnimationFrame to complete
      await new Promise((resolve) => {
        let frameCount = 0;
        const checkFrames = () => {
          frameCount++;
          if (frameCount < 3) {
            if (typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(checkFrames);
            } else {
              setTimeout(checkFrames, 0);
            }
          } else {
            resolve();
          }
        };
        Promise.resolve().then(() => {
          if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(checkFrames);
          } else {
            setTimeout(checkFrames, 0);
          }
        });
      });
      // Verify stat buttons are rendered and enabled (indicates we reached waitingForPlayerAction state)
      const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
      expect(statButtons.length).toBeGreaterThan(0);
      statButtons.forEach((btn) => {
        expect(btn.disabled).toBe(false);
      });
    });

    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);

    const chosenButton = statButtons[0];
    expect(chosenButton.dataset.stat).toBeTruthy();

    // Click stat button and verify state reflects the selection
    await withMutedConsole(async () => {
      chosenButton.click();
      // Wait for async handlers and requestAnimationFrame to complete after stat selection
      await new Promise((resolve) => {
        let frameCount = 0;
        const checkFrames = () => {
          frameCount++;
          if (frameCount < 5) {
            if (typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(checkFrames);
            } else {
              setTimeout(checkFrames, 0);
            }
          } else {
            resolve();
          }
        };
        Promise.resolve().then(() => {
          if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(checkFrames);
          } else {
            setTimeout(checkFrames, 0);
          }
        });
      });
    });

    const updatedStore = getBattleStore();
    expect(updatedStore).toBe(initialStore);
    expect(updatedStore.selectionMade).toBe(true);

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
    expect(testApi?.state?.waitForRoundsPlayed).toBeTypeOf("function");

    const { resetOpponentDelay, setOpponentDelayToZero } = setupOpponentDelayControl(testApi);
    setOpponentDelayToZero();

    try {
      await withMutedConsole(async () => {
        roundButtons[0].click();
        // Verify stat buttons appear and are enabled (indicates we reached waitingForPlayerAction state)
        const statButtons = Array.from(
          document.querySelectorAll("#stat-buttons button[data-stat]")
        );
        expect(statButtons.length).toBeGreaterThan(0);
        statButtons.forEach((btn) => {
          expect(btn.disabled).toBe(false);
        });
      });

      const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
      expect(statButtons.length).toBeGreaterThan(0);

      await withMutedConsole(async () => {
        statButtons[0].click();
        await Promise.resolve();
        expect(opponentCard?.classList.contains("is-obscured")).toBe(true);
        expect(opponentCard?.querySelector("#mystery-card-placeholder")).not.toBeNull();
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
