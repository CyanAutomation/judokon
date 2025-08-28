import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockScheduler,
  mockFeatureFlags,
  mockDataUtils,
  mockStats,
  mockRoundManager,
  mockSelectionHandler,
  mockBattleJudokaPage,
  mockShowSnackbar,
  mockTooltips,
  mockTestModeUtils,
  mockRoundSelectModal
} from "./mocks.js";

// Apply the standard classic battle mocks used in other tests.
mockScheduler();
mockFeatureFlags();
mockDataUtils();
mockStats();
mockRoundManager();
mockSelectionHandler();
mockBattleJudokaPage();
mockShowSnackbar();
mockTooltips();
mockTestModeUtils();
mockRoundSelectModal();

function createBattleDom() {
  const header = document.createElement("header");
  header.innerHTML = `
    <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
    <p id="score-display" aria-live="polite" aria-atomic="true"></p>
  `;
  const battleArea = document.createElement("div");
  battleArea.id = "battle-area";
  const stats = document.createElement("div");
  stats.id = "stat-buttons";
  const btn = document.createElement("button");
  btn.dataset.stat = "power";
  stats.appendChild(btn);
  const progressEl = document.createElement("ul");
  progressEl.id = "battle-state-progress";
  const machineState = document.createElement("div");
  machineState.id = "machine-state";
  const badge = document.createElement("span");
  badge.id = "battle-state-badge";
  document.body.append(header, battleArea, stats, progressEl, machineState, badge);
}

describe("battle-state-progress stays in sync across transitions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("tracks waitingForPlayerAction → roundDecision", async () => {
    createBattleDom();
    const { setupClassicBattlePage } = await import("../../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const { dispatchBattleEvent, onStateTransition, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );

    // Start match and wait until ready for stat selection
    await dispatchBattleEvent("startClicked");
    await onStateTransition("waitingForPlayerAction", 4000);
    const list = document.getElementById("battle-state-progress");
    let active = list.querySelector("li.active");
    expect(active?.dataset.state).toBe("waitingForPlayerAction");

    // Select a stat → roundDecision (simulate via DOM event to assert UI sync)
    document.dispatchEvent(
      new CustomEvent("battle:state", { detail: { from: "waitingForPlayerAction", to: "roundDecision" } })
    );
    active = list.querySelector("li.active");
    expect(active?.dataset.state).toBe("roundDecision");
  });
});
