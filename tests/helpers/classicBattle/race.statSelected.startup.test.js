import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

// Keep timers deterministic for resolveRound random delay
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  delete document.body.dataset.battleState;
});

// Minimal mocks for modules used by the selection flow
vi.mock("../../../src/helpers/battleEngineFacade.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
  return {
    ...actual,
    stopTimer: vi.fn()
  };
});

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

// Capture dispatched machine events and simulate no machine at click time
vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => {
  const events = [];
  return {
    dispatchBattleEvent: vi.fn(async (eventName) => {
      events.push(eventName);
      // No machine wired yet -> just resolve
    }),
    __getEvents: () => events
  };
});

describe("race: statSelected before setMachine does not stall round", () => {
  it("resolves round via machine after waitingForPlayerAction and clears playerChoice before fallback", async () => {
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

    // Make selectionHandler believe the machine is active, while event dispatcher isn't wired yet
    document.body.dataset.battleState = "waitingForPlayerAction";

    const selectionMod = await import("../../../src/helpers/classicBattle/selectionHandler.js");
    const { handleStatSelection, getPlayerAndOpponentValues } = selectionMod;
    const resolveDirectSpy = vi.spyOn(selectionMod, "resolveRoundDirect");

    const store = {
      selectionMade: false,
      playerChoice: null,
      statTimeoutId: null,
      autoSelectId: null
    };

    const { playerVal, opponentVal } = getPlayerAndOpponentValues("power");

    // Simulate user click before setMachine: this will schedule a 600ms fallback and attempt to dispatch statSelected
    const p = handleStatSelection(store, "power", { playerVal, opponentVal });

    // Immediately simulate the machine reaching waitingForPlayerAction and consuming the early selection
    const handlers = await import("../../../src/helpers/classicBattle/orchestratorHandlers.js");

    // Fake machine that routes 'statSelected' into the roundDecision handler
    const fakeMachine = {
      context: { store },
      dispatch: async (eventName) => {
        if (eventName === "statSelected") {
          await handlers.roundDecisionEnter(fakeMachine);
        }
      }
    };

    // Start the entry logic, then advance timers to let resolveRound's delay elapse
    const waitEntry = handlers.waitingForPlayerActionEnter(fakeMachine);
    // resolveRound uses ~300ms (Math.random=0), fallback at 600ms
    await vi.advanceTimersByTimeAsync(1000);
    await waitEntry;
    await p;

    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const events = eventDispatcher.__getEvents();

    // Round flow should have proceeded and cleared the choice
    expect(store.playerChoice).toBeNull();

    // Outcome and continue/matchPoint events were dispatched; evaluate may or may not appear depending on state context
    const hasOutcome = events.some((e) => String(e).startsWith("outcome="));
    expect(hasOutcome).toBe(true);
    // Should advance out of decision into either cooldown or matchDecision
    expect(events.includes("continue") || events.includes("matchPointReached")).toBe(true);

    // Fallback should not have invoked a second direct resolution
    expect(resolveDirectSpy).not.toHaveBeenCalled();
  });
});
