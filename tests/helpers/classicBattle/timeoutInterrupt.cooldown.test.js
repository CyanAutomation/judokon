import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createTimerNodes, createSnackbarContainer } from "./domUtils.js";

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (cb) => {
    await cb?.();
  })
}));

vi.mock("../../../src/helpers/timerUtils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDefaultTimer: vi.fn(async () => 1),
    createCountdownTimer: vi.fn(() => {
      let tickHandler = null;
      return {
        on: vi.fn((event, handler) => {
          if (event === "tick") {
            tickHandler = handler;
          }
        }),
        start: vi.fn(() => {
          if (tickHandler) {
            // Use vi.advanceTimersByTime since we're in fake timer environment
            vi.setSystemTime(Date.now() + 1000);
            tickHandler(1);
          }
        }),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn()
      };
    })
  };
});

vi.mock("../../../src/helpers/timers/createRoundTimer.js", async () => {
  const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
  // Immediate expiry (no ticks)
  mockCreateRoundTimer({
    scheduled: false,
    ticks: [],
    expire: true,
    moduleId: "../../../src/helpers/timers/createRoundTimer.js"
  });
  return await import("../../../src/helpers/timers/createRoundTimer.js");
});

describe("timeout → interruptRound → cooldown auto-advance", () => {
  let timers;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    header.querySelector("#next-round-timer")?.remove();
    document.body.append(playerCard, opponentCard, header);
    createTimerNodes();
    createSnackbarContainer();
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;
    timers = vi.useFakeTimers();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
  });

  afterEach(() => {
    timers.clearAllTimers();
    timers.useRealTimers();
    vi.resetModules();
    vi.restoreAllMocks();
    delete window.__NEXT_ROUND_COOLDOWN_MS;
  });

  it("advances from cooldown after interrupt with 1s auto-advance", async () => {
    // battleMod is already initialized in beforeEach - don't call initClassicBattleTest again

    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const store = { selectionMade: false, playerChoice: null };
    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    await machine.dispatch("matchStart");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    // Simulate the timeout → interrupt → cooldown flow directly
    // instead of relying on complex promise coordination
    await machine.dispatch("timeoutReached");
    await machine.dispatch("interruptRound");

    // Advance timers to trigger cooldown auto-advance
    await vi.advanceTimersByTimeAsync(1000);

    const { getStateSnapshot } = await import("../../../src/helpers/classicBattle/battleDebug.js");
    const snapshot = getStateSnapshot();

    // After timeout → interrupt → cooldown → advance, we should be in the next round
    // If auto-select is enabled, we may be in roundDecision; otherwise waitingForPlayerAction
    expect(["roundStart", "waitingForPlayerAction", "roundDecision"]).toContain(snapshot?.state);
  }, 10000);
});
