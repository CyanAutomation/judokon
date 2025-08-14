import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
      startRound: vi.fn()
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

    const header = document.createElement("header");
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true"></p>
      <div id="info-bar-right"></div>
    `;
    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const stats = document.createElement("div");
    stats.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.dataset.stat = "power";
    stats.appendChild(btn);
    document.body.append(header, battleArea, stats);

    const { setupClassicBattlePage } = await import("../../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();

    const progressList = document.getElementById("battle-state-progress");

    const badgeStates = [badge.textContent];
    const badgeObserver = new MutationObserver(() => {
      badgeStates.push(badge.textContent);
    });
    badgeObserver.observe(badge, { childList: true });

    let progressStates = [];
    let progressObserver;
    if (progressList) {
      const record = () => {
        const active = progressList.querySelector(
          ".active, [aria-current='true'], [aria-current='step']"
        );
        if (active) {
          progressStates.push(active.dataset.state || active.textContent);
        }
      };
      record();
      progressObserver = new MutationObserver(record);
      progressObserver.observe(progressList, { subtree: true, attributes: true });
    }

    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    await dispatchBattleEvent("startClicked");
    await window.waitForBattleState("waitingForPlayerAction");

    badgeObserver.disconnect();
    progressObserver?.disconnect();

    expect(badgeStates).toEqual([
      "State: waitingForMatchStart",
      "State: matchStart",
      "State: cooldown",
      "State: roundStart",
      "State: waitingForPlayerAction"
    ]);
    expect(window.__classicBattleState).toBe("waitingForPlayerAction");
    expect(badge.textContent).toBe("State: waitingForPlayerAction");

    if (progressList) {
      expect(progressStates).toEqual([
        "waitingForMatchStart",
        "matchStart",
        "cooldown",
        "roundStart",
        "waitingForPlayerAction"
      ]);
    }
  });
});
