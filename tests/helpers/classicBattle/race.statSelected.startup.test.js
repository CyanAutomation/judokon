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

describe("race: early stat selection still resolves", () => {
  it("resolves round directly and dispatches roundResolved without a machine", async () => {
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

    const selectionMod = await import("../../../src/helpers/classicBattle/selectionHandler.js");
    const { handleStatSelection, getPlayerAndOpponentValues } = selectionMod;

    const store = {
      selectionMade: false,
      playerChoice: null,
      statTimeoutId: null,
      autoSelectId: null
    };

    const { playerVal, opponentVal } = getPlayerAndOpponentValues("power");

    const p = handleStatSelection(store, "power", { playerVal, opponentVal });
    await vi.advanceTimersByTimeAsync(1000);
    await p;

    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const events = eventDispatcher.__getEvents();

    // Round flow should have proceeded and cleared the choice
    expect(store.playerChoice).toBeNull();

    // Outcome and continue/matchPoint events were dispatched
    const hasOutcome = events.some((e) => String(e).startsWith("outcome="));
    expect(hasOutcome).toBe(true);
    expect(events.includes("roundResolved")).toBe(true);
    expect(events.includes("continue") || events.includes("matchPointReached")).toBe(true);
  });
});
