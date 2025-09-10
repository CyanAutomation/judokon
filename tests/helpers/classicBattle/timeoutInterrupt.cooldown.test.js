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
    createCountdownTimer: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn()
    }))
  };
});

vi.mock("../../../src/helpers/timers/createRoundTimer.js", () => ({
  createRoundTimer: vi.fn(() => ({
    on: vi.fn((event, handler) => {
      if (event === "expired") {
        // Simulate timer expiry after fake timer advance
        setTimeout(handler, 0);
      }
    }),
    start: vi.fn()
  }))
}));

describe("timeout → interruptRound → cooldown auto-advance", () => {
  let battleMod;
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
    battleMod = await initClassicBattleTest({ afterMock: true });
  });

  afterEach(() => {
    timers.clearAllTimers();
    timers.useRealTimers();
    vi.resetModules();
    vi.restoreAllMocks();
    delete window.__NEXT_ROUND_COOLDOWN_MS;
  });

  it("advances from cooldown after interrupt with 1s auto-advance", async () => {
    console.log("[TEST] Starting test...");

    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const store = { selectionMade: false, playerChoice: null };
    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    console.log("[TEST] Machine initialized, dispatching events...");
    await machine.dispatch("matchStart");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    console.log("[TEST] About to dispatch cardsRevealed...");
    await machine.dispatch("cardsRevealed");
    console.log("[TEST] cardsRevealed dispatched, machine state:", machine.getState?.());

    const timeoutPromise = battleMod.getRoundTimeoutPromise();
    const countdownPromise = battleMod.getCountdownStartedPromise();
    console.log("[TEST] Promises created, advancing timers by 1000ms...");

    await vi.advanceTimersByTimeAsync(1000);
    console.log("[TEST] Timers advanced, waiting for timeout promise...");
    await timeoutPromise;
    console.log("[TEST] Timeout promise resolved, waiting for countdown promise...");
    await countdownPromise;
    console.log("[TEST] Countdown promise resolved, advancing timers by 1000ms again...");

    await vi.advanceTimersByTimeAsync(1000);
    const { getStateSnapshot } = await import("../../../src/helpers/classicBattle/battleDebug.js");
    const snapshot = getStateSnapshot();
    console.log("[TEST] Final snapshot:", snapshot);
    // After timeout → interrupt → cooldown → advance, we should be in the next round
    // If auto-select is enabled, we may be in roundDecision; otherwise waitingForPlayerAction
    expect(["roundStart", "waitingForPlayerAction", "roundDecision"]).toContain(snapshot?.state);
  }, 10000);
});
