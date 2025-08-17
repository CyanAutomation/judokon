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
import classicBattleStates from "../../../src/data/classicBattleStates.json" with { type: "json" };

// Apply all the necessary mocks
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

const coreStateIds = classicBattleStates
  .filter((s) => s.id < 90)
  .sort((a, b) => a.id - b.id)
  .map((s) => String(s.id));

function createBattleDom() {
  const header = document.createElement("header");
  header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true"></p>
      <div class="scoreboard-right" id="scoreboard-right"></div>
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
  document.body.append(header, battleArea, stats, progressEl);
}

describe("battleStateBadge displays state transitions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders initial progress list and badge", async () => {
    createBattleDom();
    const { setupClassicBattlePage } = await import("../../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const progressList = document.getElementById("battle-state-progress");
    const items = Array.from(progressList.querySelectorAll("li")).map((li) => li.textContent);
    expect(items.slice(0, coreStateIds.length)).toEqual(coreStateIds);

    const badge = document.getElementById("battle-state-badge");
    expect(badge.textContent).toBe("State: waitingForMatchStart");
  });

  it("updates badge text on state transitions", async () => {
    createBattleDom();
    const { setupClassicBattlePage } = await import("../../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const badge = document.getElementById("battle-state-badge");
    const badgeStates = [badge.textContent];
    const badgeObserver = new MutationObserver(() => {
      badgeStates.push(badge.textContent);
    });
    badgeObserver.observe(badge, { childList: true });

    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    await dispatchBattleEvent("startClicked");
    await window.waitForBattleState("waitingForPlayerAction");

    badgeObserver.disconnect();

    expect(badgeStates).toEqual([
      "State: waitingForMatchStart",
      "State: matchStart",
      "State: cooldown",
      "State: roundStart",
      "State: waitingForPlayerAction"
    ]);
  });
});
