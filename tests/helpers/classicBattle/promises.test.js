import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../../src/helpers/classicBattle/battleEvents.js";
import * as battleEvents from "../../../src/helpers/classicBattle/battleEvents.js";
import {
  getRoundPromptPromise,
  resetBattlePromises
} from "../../../src/helpers/classicBattle/promises.js";

describe("classic battle promise subscriptions", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
    window.__promiseEvents = [];
    resetBattlePromises();
  });

  it("unsubscribes prior handlers before re-registering on reset", () => {
    const offSpy = vi.spyOn(battleEvents, "offBattleEvent");

    resetBattlePromises();

    expect(offSpy).toHaveBeenCalledTimes(8);
  });

  it("does not multiply roundPrompt handling after repeated resets", async () => {
    resetBattlePromises();
    resetBattlePromises();

    const pendingRoundPrompt = getRoundPromptPromise();
    emitBattleEvent("roundPrompt");
    await pendingRoundPrompt;

    const roundPromptResolves = window.__promiseEvents.filter(
      (event) => event.type === "promise-resolve" && event.key === "roundPromptPromise"
    );

    expect(roundPromptResolves).toHaveLength(1);
  });
});
