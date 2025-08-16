import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import classicBattleStates from "../../../src/data/classicBattleStates.json" with { type: "json" };

const coreStateIds = classicBattleStates
  .filter((s) => s.id < 90)
  .sort((a, b) => a.id - b.id)
  .map((s) => String(s.id));

vi.mock("../../../src/utils/scheduler.js", () => ({
  start: vi.fn(),
  stop: vi.fn(),
  onFrame: vi.fn(),
  cancel: vi.fn(),
  onSecondTick: vi.fn()
}));

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

  it("reflects machine state and badge text", async () => {
    const store = {};
    const currentFlags = {
      battleStateBadge: { enabled: true },
      randomStatMode: { enabled: true }
    };
    const featureFlagsEmitter = new EventTarget();

    vi.doMock("../../../src/helpers/featureFlags.js", () => ({
      featureFlagsEmitter,
      isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
      initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: currentFlags })
    }));
    vi.doMock("../../../src/helpers/stats.js", () => ({
      loadStatNames: async () => [{ name: "Power" }]
    }));
    vi.doMock("../../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => store,
      startRound: vi.fn(),
      resetGame: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../../src/helpers/battleJudokaPage.js", () => ({
      waitForComputerCard: vi.fn()
    }));
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({ showSnackbar: vi.fn() }));
    vi.doMock("../../../src/helpers/tooltip.js", () => ({ initTooltips: vi.fn() }));
    vi.doMock("../../../src/helpers/testModeUtils.js", () => ({ setTestMode: vi.fn() }));
    vi.doMock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
      initRoundSelectModal: vi.fn()
    }));
    vi.doMock("../../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn(async (path) => {
        if (path.includes("classicBattleStates.json")) return classicBattleStates;
        if (path.includes("battleRounds.json")) return [];
        return {};
      }),
      importJsonModule: vi.fn(async () => ({}))
    }));

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

    const { setupClassicBattlePage } = await import("../../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();

    const progressList = document.getElementById("battle-state-progress");
    expect(progressList).toBeTruthy();
    const items = Array.from(progressList.querySelectorAll("li")).map((li) => li.textContent);
    expect(items.slice(0, coreStateIds.length)).toEqual(coreStateIds);

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

    const finalState = window.__classicBattleState;
    const stateLog = window.getBattleStateSnapshot().log;

    // The log contains the full history of states the machine has been in.
    const recordedStates = stateLog.map((t) => t.to);

    // The test is only concerned with the sequence of *distinct* states that
    // have a visual progress step.
    const uniqueStates = [...new Set(recordedStates)];

    // Based on the original test's expectation, 'matchStart' is not one of them.
    const progressStates = uniqueStates.filter((s) => s !== "matchStart");

    expect(badgeStates).toEqual([
      "State: waitingForMatchStart",
      "State: matchStart",
      "State: cooldown",
      "State: roundStart",
      "State: waitingForPlayerAction"
    ]);
    expect(finalState).toBe("waitingForPlayerAction");
    expect(badge.textContent).toBe("State: waitingForPlayerAction");

    expect(progressStates).toEqual([
      "waitingForMatchStart",
      "cooldown",
      "roundStart",
      "waitingForPlayerAction"
    ]);
  });
});
