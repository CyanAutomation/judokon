import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/battleEvents.js");
  return {
    ...actual,
    emitBattleEvent: emitSpy
  };
});

// Keep timers deterministic for resolveRound random delay
let timers;
beforeEach(() => {
  timers = useCanonicalTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  timers.cleanup();
  vi.restoreAllMocks();
  emitSpy.mockClear();
  document.body.innerHTML = "";
  delete document.body.dataset.battleState;
});

vi.mock("../../../src/helpers/BattleEngine.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/BattleEngine.js");
  return {
    ...actual,
    stopTimer: vi.fn()
  };
});

describe("race: early stat selection still resolves", () => {
  it("resolves round directly when orchestrator is not active", async () => {
    // DOM setup: cards + header
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    playerCard.innerHTML = `<ul>
      <li class="stat"><strong>Power</strong> <span>5</span></li>
      <li class="stat"><strong>Speed</strong> <span>1</span></li>
      <li class="stat"><strong>Technique</strong> <span>1</span></li>
      <li class="stat"><strong>Kumi-kata</strong> <span>1</span></li>
      <li class="stat"><strong>Newaza</strong> <span>1</span></li>
    </ul>`;
    opponentCard.innerHTML = `<ul>
      <li class="stat"><strong>Power</strong> <span>3</span></li>
      <li class="stat"><strong>Speed</strong> <span>1</span></li>
      <li class="stat"><strong>Technique</strong> <span>1</span></li>
      <li class="stat"><strong>Kumi-kata</strong> <span>1</span></li>
      <li class="stat"><strong>Newaza</strong> <span>1</span></li>
    </ul>`;
    document.body.append(playerCard, opponentCard, header);

    const { handleStatSelection, getPlayerAndOpponentValues } = await import(
      "../../../src/helpers/classicBattle/selectionHandler.js"
    );

    const store = {
      selectionMade: false,
      playerChoice: null,
      statTimeoutId: null,
      autoSelectId: null
    };

    const { playerVal, opponentVal } = getPlayerAndOpponentValues("power");

    const p = handleStatSelection(store, "power", { playerVal, opponentVal });
    await vi.runAllTimersAsync();
    await p;

    // Round flow should have proceeded and cleared the choice
    expect(store.playerChoice).toBeNull();

    // Verify the round was resolved (lastRoundResult is set)
    expect(store.lastRoundResult).toBeDefined();
    expect(store.lastRoundResult.outcome).toMatch(/winPlayer|winOpponent|draw/);
  });
});

describe("race: manual click + timeout auto-select lock", () => {
  it("accepts only one lock for near-simultaneous statSelected intents", async () => {
    const { BattleEngine } = await import("../../../src/helpers/BattleEngine.js");
    const engine = new BattleEngine();
    const store = { roundsPlayed: 0 };

    const machine = await createStateManager(
      {},
      {
        engine,
        store
      },
      undefined,
      CLASSIC_BATTLE_STATES
    );

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    const manual = await machine.dispatch("statSelected", {
      stat: "power",
      opts: { selectionSource: "player", intent: "statSelected", roundKey: 1 }
    });

    expect(manual).toBe(true);
    expect(machine.getState()).toBe("roundResolve");

    const duplicateAuto = await machine.dispatch("statSelected", {
      stat: "speed",
      opts: { selectionSource: "auto", intent: "statSelected", roundKey: 1 }
    });

    expect(duplicateAuto).toBe(false);

    const lockEvents = emitSpy.mock.calls.filter(
      ([eventName]) => eventName === "round.selection.locked"
    );
    expect(lockEvents).toHaveLength(1);
    expect(lockEvents[0][1]).toEqual(
      expect.objectContaining({
        accepted: true,
        reason: "ok",
        source: "player",
        roundKey: 1
      })
    );

    expect(emitSpy).toHaveBeenCalledWith(
      "input.ignored",
      expect.objectContaining({
        kind: "selectionLockRejected",
        reason: expect.stringMatching(/duplicate|invalidState/),
        source: "auto"
      })
    );
  });
});
