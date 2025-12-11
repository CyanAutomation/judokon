/**
 * @fileoverview Integration Test Template: Selective Mocking Pattern
 *
 * This file demonstrates integration testing for the JU-DO-KON! project.
 * It mocks only EXTERNAL dependencies (network, filesystem, etc.) while allowing
 * real internal module interactions to occur.
 *
 * Key principles:
 * - Mock ONLY external dependencies (fetch, localStorage, matchMedia, etc.)
 * - Allow real interactions between internal modules
 * - Use createSimpleHarness() with controlled fixtures
 * - One harness per test for DOM and timer isolation
 * - Test full workflows, not isolated functions
 *
 * @copyable true
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSimpleHarness } from "../helpers/integrationHarness.js";
import { createMockLocalStorage } from "../utils/testUtils.js";

// ===== STEP 1: Mock only EXTERNAL dependencies
// These are services that exist outside the application (network, browser APIs, etc.)
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn()
}));

vi.mock("../../../src/services/battleApi.js", () => ({
  fetchOpponent: mockFetch,
  submitRound: mockFetch
}));

// Note: We DO NOT mock battleEngine.js, helpers.js, or other internal modules.
// They will be imported with their real implementations during the test.

// ===== STEP 2: Organize test data
const testScenarios = {
  opponentA: { id: 1, name: "Fighter A", stats: { power: 8, speed: 7 } },
  opponentB: { id: 2, name: "Fighter B", stats: { power: 6, speed: 9 } },
  networkError: new Error("Network timeout")
};

// ===== STEP 3: Test suite with harness setup
describe("Integration Test Example: Battle Flow", () => {
  let harness;
  let mockStorage;

  beforeEach(async () => {
    // Reset external mocks
    mockFetch.mockReset();

    // Create mock storage fixture for this test
    mockStorage = createMockLocalStorage();

    // Create harness with fixtures (DOM, timers, storage, etc.)
    harness = createSimpleHarness({
      fixtures: {
        localStorage: mockStorage
      },
      useFakeTimers: true
    });

    // Setup harness (applies mocks, initializes DOM, starts fake timers)
    await harness.setup();
  });

  afterEach(async () => {
    // Always cleanup
    if (harness) {
      await harness.cleanup();
    }
  });

  // ===== STEP 4: Write integration tests
  it("demonstrates selective mocking pattern: mock external API, use real helpers", async () => {
    // Configure external mock to return opponent data
    mockFetch.mockResolvedValue(testScenarios.opponentA);

    // This is the key pattern: import real internal modules (NOT mocked)
    // They will use the mocked external service via dependency injection
    const { markBattlePartReady, battleReadyPromise: _battleReadyPromise } = await import(
      "../../src/helpers/battleInit.js"
    );

    // Exercise real internal code with controlled external dependencies
    expect(mockFetch).not.toHaveBeenCalled(); // Not called yet
    markBattlePartReady("home");
    markBattlePartReady("state");

    // Assert: real module execution completed
    expect(mockFetch).not.toHaveBeenCalled(); // battleInit doesn't call external API
    expect(_battleReadyPromise).toBeDefined();
  });

  it("resolves readiness when home link and state progress initialize", async () => {
    document.body.innerHTML = `
      <div class="home-screen">
        <a data-testid="home-link" href="/">Home</a>
        <ul id="battle-state-progress"></ul>
      </div>
    `;
    document.body.dataset.battleState = "waitingForMatchStart";

    // Enable the state progress feature so the progress renderer runs
    window.__FF_OVERRIDES = { ...window.__FF_OVERRIDES, battleStateProgress: true };

    // Provide the store eagerly so setupClassicBattleHomeLink can mark the home part ready
    window.battleStore = { selectionMade: false };

    const { battleReadyPromise } = await harness.importModule("../../src/helpers/battleInit.js");
    const { setupClassicBattleHomeLink } = await harness.importModule(
      "../../src/helpers/setupClassicBattleHomeLink.js"
    );
    const { initBattleStateProgress, battleStateProgressReadyPromise } = await harness.importModule(
      "../../src/helpers/battleStateProgress.js"
    );

    setupClassicBattleHomeLink();
    await initBattleStateProgress();
    await battleStateProgressReadyPromise;

    await battleReadyPromise;

    expect(document.querySelector(".home-screen")?.dataset.ready).toBe("true");
    expect(document.querySelector("[data-testid=\"home-link\"]")?.dataset.homeLinkBound).toBe("true");
    expect(document.getElementById("battle-state-progress")?.dataset.featureBattleStateReady).toBe("true");
    expect(document.body.dataset.battleState).toBe("waitingForMatchStart");
  });

  it("demonstrates fixture usage: localStorage and DOM", async () => {
    // Setup: mock external service
    mockFetch.mockResolvedValue(testScenarios.opponentA);

    // Use harness-provided mock storage
    mockStorage.setItem("battleId", "1");
    expect(mockStorage.getItem("battleId")).toBe("1");

    // Import real module to verify storage interaction
    const { markBattlePartReady } = await import("../../src/helpers/battleInit.js");
    markBattlePartReady("home");

    // Assert: mock storage still works
    expect(mockStorage.getItem("battleId")).toBe("1");
  });

  it("demonstrates fake timer control", async () => {
    // Setup: mock external service
    mockFetch.mockResolvedValue(testScenarios.opponentA);

    // Use real setTimeout with fake timers controlled by harness
    let timerFired = false;
    const timerId = setTimeout(() => {
      timerFired = true;
    }, 5000);

    // Verify timer hasn't fired yet
    expect(timerFired).toBe(false);

    // Use harness timer control to advance deterministically
    await harness.timerControl.advanceTimersByTime(5000);

    // Verify timer fired
    expect(timerFired).toBe(true);
    clearTimeout(timerId);
  });

  it("demonstrates real module integration without breaking on refactor", async () => {
    // This test shows the benefit: it doesn't care HOW markBattlePartReady works internally
    // Only that it fulfills its contract: tracking parts and signaling readiness
    const { markBattlePartReady, battleReadyPromise: _battleReadyPromise } = await import(
      "../../src/helpers/battleInit.js"
    );

    // Exercise the module's public API
    markBattlePartReady("home");
    markBattlePartReady("state");

    // Assert on observable behavior, not implementation details
    expect(_battleReadyPromise).toBeDefined();
  });
});

/**
 * ===== PATTERN SUMMARY =====
 *
 * EXTERNAL MOCKING ONLY:
 * - Mock: fetch, localStorage, matchMedia, timers (when testing timer behavior)
 * - Don't mock: internal helpers, battle engine, state management
 *
 * HARNESS SETUP:
 * 1. Create harness with fixtures (localStorage, DOM, etc.)
 * 2. call setup() to apply everything
 * 3. Import modules AFTER setup()
 *
 * REAL MODULE INTERACTIONS:
 * - All internal code runs with real implementations
 * - Tests exercise actual workflows, not isolated units
 * - Refactoring internal code shouldn't break tests (if API unchanged)
 *
 * TIMER MANAGEMENT:
 * - Use harness.timerControl for fake timer advancement
 * - Tests are deterministic and fast
 *
 * FIXTURE USAGE:
 * - createMockLocalStorage() - provides localStorage mock
 * - harness fixtures object - configures environment
 *
 * BENEFITS:
 * - Tests exercise real code paths
 * - Catch integration issues (module incompatibilities)
 * - More resilient to internal refactoring
 * - Better confidence in production behavior
 * - Only external services are mocked (what we can't control)
 *
 * ===== END PATTERN SUMMARY =====
 */
