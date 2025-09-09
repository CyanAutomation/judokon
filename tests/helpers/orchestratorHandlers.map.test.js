import { describe, it, expect } from "vitest";
import stateHandlers from "../../src/helpers/classicBattle/stateHandlers.js";
import {
  getOnEnterHandler,
  getOnExitHandler,
  waitingForMatchStartEnter,
  matchStartEnter,
  cooldownEnter,
  roundStartEnter,
  waitingForPlayerActionEnter,
  waitingForPlayerActionExit,
  roundDecisionEnter,
  roundDecisionExit,
  roundOverEnter,
  matchDecisionEnter,
  matchOverEnter,
  interruptRoundEnter,
  interruptMatchEnter,
  roundModificationEnter
} from "../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("stateHandlers map", () => {
  it("binds onEnter and onExit handlers", () => {
    expect(stateHandlers.waitingForMatchStart.onEnter).toBe(waitingForMatchStartEnter);
    expect(stateHandlers.matchStart.onEnter).toBe(matchStartEnter);
    expect(stateHandlers.cooldown.onEnter).toBe(cooldownEnter);
    expect(stateHandlers.roundStart.onEnter).toBe(roundStartEnter);
    expect(stateHandlers.waitingForPlayerAction.onEnter).toBe(waitingForPlayerActionEnter);
    expect(stateHandlers.waitingForPlayerAction.onExit).toBe(waitingForPlayerActionExit);
    expect(stateHandlers.roundDecision.onEnter).toBe(roundDecisionEnter);
    expect(stateHandlers.roundDecision.onExit).toBe(roundDecisionExit);
    expect(stateHandlers.roundOver.onEnter).toBe(roundOverEnter);
    expect(stateHandlers.matchDecision.onEnter).toBe(matchDecisionEnter);
    expect(stateHandlers.matchOver.onEnter).toBe(matchOverEnter);
    expect(stateHandlers.interruptRound.onEnter).toBe(interruptRoundEnter);
    expect(stateHandlers.interruptMatch.onEnter).toBe(interruptMatchEnter);
    expect(stateHandlers.roundModification.onEnter).toBe(roundModificationEnter);
  });

  it("returns undefined for unknown state", () => {
    expect(getOnEnterHandler("missing")).toBeUndefined();
    expect(getOnExitHandler("missing")).toBeUndefined();
  });
});
