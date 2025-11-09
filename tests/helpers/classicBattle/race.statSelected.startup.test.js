import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

// Keep timers deterministic for resolveRound random delay
let timers;
beforeEach(() => {
  timers = useCanonicalTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  timers.cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  delete document.body.dataset.battleState;
});

vi.mock("../../../src/helpers/battleEngineFacade.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
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
