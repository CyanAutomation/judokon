import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const scoreboardMock = {
  showMessage: vi.fn(),
  updateScore: vi.fn(),
  clearMessage: vi.fn(),
  showTemporaryMessage: vi.fn(),
  clearTimer: vi.fn(),
  updateTimer: vi.fn(),
  showAutoSelect: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn()
};

vi.mock("../../../src/helpers/setupScoreboard.js", () => scoreboardMock);
vi.mock("/src/helpers/setupScoreboard.js", () => scoreboardMock);
vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));
vi.mock("/src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  handleReplay: vi.fn(),
  isOrchestrated: vi.fn(() => false)
}));
vi.mock("/src/helpers/classicBattle/roundManager.js", () => ({
  handleReplay: vi.fn(),
  isOrchestrated: vi.fn(() => false)
}));
vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: vi.fn(() => 3)
}));
vi.mock("/src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: vi.fn(() => 3)
}));
vi.mock("../../../src/helpers/timers/createRoundTimer.js", () => ({
  createRoundTimer: vi.fn(() => ({ start: vi.fn() }))
}));
vi.mock("/src/helpers/timers/createRoundTimer.js", () => ({
  createRoundTimer: vi.fn(() => ({ start: vi.fn() }))
}));
vi.mock("../../../src/helpers/CooldownRenderer.js", () => ({
  attachCooldownRenderer: vi.fn()
}));
vi.mock("/src/helpers/CooldownRenderer.js", () => ({
  attachCooldownRenderer: vi.fn()
}));
vi.mock("../../../src/helpers/battle/index.js", () => ({
  resetStatButtons: vi.fn()
}));
vi.mock("/src/helpers/battle/index.js", () => ({
  resetStatButtons: vi.fn()
}));

const roundResolvedDetail = {
  store: {},
  result: { matchEnded: false, message: "", playerScore: 0, opponentScore: 0 }
};

describe("updateDebugPanel wiring for dynamic handlers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete globalThis.__cbRoundUIDynamicBoundTargets;
  });

  afterEach(() => {
    vi.doUnmock("/src/helpers/classicBattle/uiHelpers.js");
    vi.doUnmock("/src/helpers/classicBattle/debugPanel.js");
  });

  it("re-exports updateDebugPanel for direct dynamic imports", async () => {
    const uiHelpers = await import("/src/helpers/classicBattle/uiHelpers.js");
    const debugPanel = await import("/src/helpers/classicBattle/debugPanel.js");
    expect(uiHelpers.updateDebugPanel).toBe(debugPanel.updateDebugPanel);
  });

  it("passes mocked updateDebugPanel to bindRoundUIEventHandlersDynamic", async () => {
    const fallbackUpdateDebugPanel = vi.fn(() => {
      throw new Error("fallback updateDebugPanel should not run");
    });
    vi.doMock("/src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: fallbackUpdateDebugPanel
    }));
    const mockedUpdateDebugPanel = vi.fn();
    vi.doMock("/src/helpers/classicBattle/uiHelpers.js", async () => {
      const actual = await vi.importActual("/src/helpers/classicBattle/uiHelpers.js");
      return {
        ...actual,
        updateDebugPanel: mockedUpdateDebugPanel,
        renderOpponentCard: vi.fn(),
        disableNextRoundButton: vi.fn(),
        enableNextRoundButton: vi.fn()
      };
    });

    const events = await import("/src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const onBattleEventSpy = vi.spyOn(events, "onBattleEvent");
    const roundUI = await import("/src/helpers/classicBattle/roundUI.js");
    roundUI.bindRoundUIEventHandlersDynamic();
    const roundResolvedCall = onBattleEventSpy.mock.calls.find(
      ([eventName]) => eventName === "roundResolved"
    );
    expect(roundResolvedCall?.[1]).toBeTypeOf("function");
    await roundResolvedCall[1]({ detail: roundResolvedDetail });

    expect(mockedUpdateDebugPanel).toHaveBeenCalled();
    expect(fallbackUpdateDebugPanel).not.toHaveBeenCalled();
  });
});
