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

describe("battleStateProgress updates on object-shaped battle:state", () => {
  beforeEach(() => {
    vi.doMock("../../../src/helpers/featureFlags.js", () => ({
      isEnabled: () => true
    }));
    document.body.innerHTML = `
      <ul id="battle-state-progress"></ul>
      <div id="battle-state-badge"></div>
    `;
  });

  it("renders list and marks active on {from,to}", async () => {
    const mod = await import("../../../src/helpers/battleStateProgress.js");
    await mod.initBattleStateProgress();

    // Simulate an initial render; the list should contain core states
    const list = document.getElementById("battle-state-progress");
    expect(list.children.length).toBeGreaterThan(0);

    // Dispatch an object-shaped event and verify the active item toggles.
    document.dispatchEvent(
      new CustomEvent("battle:state", { detail: { from: "x", to: "cooldown" } })
    );
    const active = list.querySelector("li.active");
    expect(active?.dataset.state).toBe("cooldown");

    // Badge also updates
    const badge = document.getElementById("battle-state-badge");
    expect(badge.textContent).toBe("State: cooldown");
  });
});

describe("battleStateProgress disabled", () => {
  it("resolves without rendering", async () => {
    vi.doMock("../../../src/helpers/featureFlags.js", () => ({
      isEnabled: () => false
    }));
    document.body.innerHTML = '<ul id="battle-state-progress"></ul>';
    const mod = await import("../../../src/helpers/battleStateProgress.js");
    await mod.initBattleStateProgress();
    const list = document.getElementById("battle-state-progress");
    expect(list.children.length).toBe(0);
    await mod.battleStateProgressReadyPromise;
  });
});

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

  it("tracks waitingForPlayerAction \u2192 roundDecision", async () => {
    mockScheduler();
    mockFeatureFlags({ battleStateProgress: { enabled: true } });
    mockDataUtils();
    mockStats();
    mockRoundManager();
    mockSelectionHandler();
    mockBattleJudokaPage();
    mockShowSnackbar();
    mockTooltips();
    mockTestModeUtils();
    mockRoundSelectModal();

    createBattleDom();
    const { setupClassicBattlePage } = await import("../../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const { dispatchBattleEvent, onStateTransition } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );

    await dispatchBattleEvent("startClicked");
    await onStateTransition("waitingForPlayerAction", 4000);
    const list = document.getElementById("battle-state-progress");
    let active = list.querySelector("li.active");
    expect(active?.dataset.state).toBe("waitingForPlayerAction");

    document.dispatchEvent(
      new CustomEvent("battle:state", {
        detail: { from: "waitingForPlayerAction", to: "roundDecision" }
      })
    );
    active = list.querySelector("li.active");
    expect(active?.dataset.state).toBe("roundDecision");
  });
});
