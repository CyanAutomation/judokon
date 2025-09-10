import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createTimerNodes, createSnackbarContainer } from "./domUtils.js";

describe("timeout → interruptRound → cooldown auto-advance", () => {
  let battleMod;
  let timers;

  beforeEach(async () => {
    vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
      initRoundSelectModal: vi.fn(async (cb) => {
        await cb?.();
      })
    }));
    vi.mock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: vi.fn(async () => 1)
    }));
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

    const timeoutPromise = battleMod.getRoundTimeoutPromise();
    const countdownPromise = battleMod.getCountdownStartedPromise();

    await vi.advanceTimersByTimeAsync(1000);
    await timeoutPromise;
    await countdownPromise;

    await vi.advanceTimersByTimeAsync(1000);
    const { getStateSnapshot } = await import("../../../src/helpers/classicBattle/battleDebug.js");
    const snapshot = getStateSnapshot();
    expect(["roundStart", "waitingForPlayerAction"]).toContain(snapshot?.state);
  }, 10000);
});
