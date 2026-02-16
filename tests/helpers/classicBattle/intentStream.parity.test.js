import { describe, it, expect } from "vitest";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";

const canonicalIntents = [
  { type: "startMatch" },
  { type: "roundReady" },
  { type: "cardsRevealed" },
  { type: "selectStatByIndex", index: 1 },
  { type: "roundOutcomeConfirmed" },
  { type: "matchEvaluated" }
];

function classicIntentToEvent(intent) {
  switch (intent.type) {
    case "startMatch":
      return "startClicked";
    case "roundReady":
      return "ready";
    case "cardsRevealed":
      return "cardsRevealed";
    case "selectStatByIndex":
      return "statSelected";
    case "roundOutcomeConfirmed":
      return "continue";
    case "matchEvaluated":
      return "evaluateMatch";
    default:
      return null;
  }
}

function cliIntentToEvent(intent) {
  switch (intent.type) {
    case "startMatch":
      return "startClicked";
    case "roundReady":
      return "ready";
    case "cardsRevealed":
      return "cardsRevealed";
    case "selectStatByIndex":
      return "statSelected";
    case "roundOutcomeConfirmed":
      return "continue";
    case "matchEvaluated":
      return "evaluateMatch";
    default:
      return null;
  }
}

async function driveMachine(intents, mapIntentToEvent) {
  const transitions = [];
  const machine = await createStateManager({}, {}, ({ to }) => {
    transitions.push(to);
  });

  for (const intent of intents) {
    const eventName = mapIntentToEvent(intent);
    if (!eventName) continue;
    await machine.dispatch(eventName);
  }

  return transitions;
}

describe("intent stream parity", () => {
  it("produces identical transition sequences for Classic and CLI mappings", async () => {
    const classicTransitions = await driveMachine(canonicalIntents, classicIntentToEvent);
    const cliTransitions = await driveMachine(canonicalIntents, cliIntentToEvent);

    expect(cliTransitions).toEqual(classicTransitions);
  });
});
