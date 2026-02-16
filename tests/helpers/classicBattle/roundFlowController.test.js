import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

const handlerRegistry = new Map();

const onBattleEventMock = vi.fn((type, handler) => {
  handlerRegistry.set(type, handler);
});

const getSelectionDelayOverrideMock = vi.fn(() => 25);
const getOpponentDelayMock = vi.fn(() => 5);
const isEnabledMock = vi.fn((flag) => flag === "opponentDelayMessage");
const showRoundOutcomeMock = vi.fn();
const handleRoundStartedEventMock = vi.fn(async () => {});
const handleRoundResolvedEventMock = vi.fn(async () => {});

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: onBattleEventMock,
  getBattleEventTarget: vi.fn(() => new EventTarget())
}));

vi.mock("../../../src/helpers/classicBattle/roundUI.js", () => ({
  handleRoundStartedEvent: handleRoundStartedEventMock,
  handleRoundResolvedEvent: handleRoundResolvedEventMock
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  showRoundOutcome: showRoundOutcomeMock
}));

vi.mock("../../../src/helpers/featureFlags.js", () => ({
  isEnabled: isEnabledMock
}));

vi.mock("../../../src/helpers/classicBattle/snackbar.js", () => ({
  getOpponentDelay: getOpponentDelayMock
}));

vi.mock("../../../src/helpers/classicBattle/selectionDelayCalculator.js", () => ({
  getSelectionDelayOverride: getSelectionDelayOverrideMock
}));

describe("roundFlowController", () => {
  let timerControl;

  beforeEach(() => {
    timerControl = useCanonicalTimers();
    handlerRegistry.clear();
    onBattleEventMock.mockClear();
    getSelectionDelayOverrideMock.mockClear();
    getOpponentDelayMock.mockClear();
    isEnabledMock.mockClear();
    showRoundOutcomeMock.mockClear();
    handleRoundStartedEventMock.mockClear();
    handleRoundResolvedEventMock.mockClear();
  });

  afterEach(() => {
    timerControl?.cleanup();
  });

  it("uses selection delay override when displaying round outcome", async () => {
    const { bindRoundFlowController } = await import(
      "../../../src/helpers/classicBattle/roundFlowController.js"
    );

    bindRoundFlowController();

    const evaluated = handlerRegistry.get("round.evaluated");
    const stateChanged = handlerRegistry.get("state.transitioned");

    await evaluated({
      detail: { message: "Player wins", stat: "speed", playerVal: 9, opponentVal: 7 }
    });

    stateChanged({ detail: { to: "roundDisplay" } });

    await vi.advanceTimersByTimeAsync(24);
    expect(showRoundOutcomeMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(getSelectionDelayOverrideMock).toHaveBeenCalledTimes(1);
    expect(showRoundOutcomeMock).toHaveBeenCalledWith("Player wins", "speed", 9, 7);
  });
});
