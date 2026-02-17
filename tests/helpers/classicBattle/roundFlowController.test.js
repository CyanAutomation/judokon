import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { EVENT_TYPES } from "../../../src/helpers/classicBattle/eventCatalog.js";

const handlerRegistry = new Map();

const onBattleEventMock = vi.fn((type, handler) => {
  handlerRegistry.set(type, handler);
});
const emitBattleEventMock = vi.fn();
const sharedEventTarget = new EventTarget();

const getSelectionDelayOverrideMock = vi.fn(() => 25);
const getOpponentDelayMock = vi.fn(() => 5);
const isEnabledMock = vi.fn((flag) => flag === "opponentDelayMessage");
const showRoundOutcomeMock = vi.fn();
const handleRoundStartedEventMock = vi.fn(async () => {});
const handleRoundResolvedEventMock = vi.fn(async () => {});

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: onBattleEventMock,
  emitBattleEvent: emitBattleEventMock,
  getBattleEventTarget: vi.fn(() => sharedEventTarget)
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
    emitBattleEventMock.mockClear();
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

    void evaluated({
      detail: { message: "Player wins", stat: "speed", playerVal: 9, opponentVal: 7 }
    });

    await vi.advanceTimersByTimeAsync(24);
    expect(showRoundOutcomeMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(getSelectionDelayOverrideMock).toHaveBeenCalledTimes(1);
    expect(showRoundOutcomeMock).toHaveBeenCalledWith("Player wins", "speed", 9, 7);
    expect(emitBattleEventMock).toHaveBeenCalledWith("timer.opponentDelay.expired", {
      sequence: 1,
      delayMs: 25
    });
  });

  it("cancels stale opponent-delay outcome when a newer result arrives", async () => {
    const { bindRoundFlowController } = await import(
      "../../../src/helpers/classicBattle/roundFlowController.js"
    );

    bindRoundFlowController();

    const evaluated = handlerRegistry.get("round.evaluated");

    void evaluated({ detail: { message: "old", stat: "speed", playerVal: 2, opponentVal: 1 } });
    await vi.advanceTimersByTimeAsync(10);

    void evaluated({ detail: { message: "new", stat: "power", playerVal: 5, opponentVal: 1 } });

    await vi.advanceTimersByTimeAsync(15);
    expect(showRoundOutcomeMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10);
    expect(showRoundOutcomeMock).toHaveBeenCalledTimes(1);
    expect(showRoundOutcomeMock).toHaveBeenCalledWith("new", "power", 5, 1);
  });

  it("bindRoundFlowControllerOnce only subscribes once for state transitions", async () => {
    const { bindRoundFlowControllerOnce } = await import(
      "../../../src/helpers/classicBattle/roundFlowController.js"
    );

    bindRoundFlowControllerOnce();
    bindRoundFlowControllerOnce();

    const transitionSubscriptions = onBattleEventMock.mock.calls.filter(
      ([type]) => type === EVENT_TYPES.STATE_TRANSITIONED
    );
    expect(transitionSubscriptions).toHaveLength(1);
  });
});
