import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindUIHelperEventHandlersDynamic,
  __testHooks
} from "../../../src/helpers/classicBattle/uiEventHandlers.js";
import {
  __resetBattleEventTarget,
  emitBattleEvent,
  offBattleEvent,
  onBattleEvent
} from "../../../src/helpers/classicBattle/battleEvents.js";
import { createBattleCardContainers } from "../../utils/testUtils.js";

describe("uiEventHandlers reveal cleanup", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
    __testHooks.resetPendingOpponentCardDataState();
    document.body.replaceChildren();

    const { opponentCard } = createBattleCardContainers();
    document.body.append(opponentCard);
  });

  it("clears pending token when resolved opponent card data is unavailable", async () => {
    const getOpponentCardData = vi.fn().mockResolvedValue(null);

    bindUIHelperEventHandlersDynamic({
      getOpponentCardData,
      renderOpponentCard: vi.fn(),
      showStatComparison: vi.fn(),
      updateDebugPanel: vi.fn(),
      scoreboard: { clearTimer: vi.fn() },
      isEnabled: vi.fn(() => false),
      getOpponentDelay: vi.fn(() => 0)
    });

    __testHooks.setPendingOpponentCardData(null, 4, 99);

    const completionDetail = await new Promise((resolve) => {
      const handler = (event) => {
        offBattleEvent("opponentReveal.completed", handler);
        resolve(event.detail);
      };
      onBattleEvent("opponentReveal.completed", handler);
      emitBattleEvent("round.evaluated", {
        store: {},
        statKey: "power",
        playerVal: 4,
        opponentVal: 3
      });
    });

    expect(completionDetail).toMatchObject({ cancelled: true, selectionToken: 99 });
    expect(getOpponentCardData).toHaveBeenCalledTimes(1);
    expect(__testHooks.getPendingOpponentCardDataState()).toEqual({
      cardData: null,
      sequence: 0,
      token: null
    });
  });
});
