import { waitingForMatchStartEnter } from "./stateHandlers/waitingForMatchStartEnter.js";
import { matchStartEnter } from "./stateHandlers/matchStartEnter.js";
import { cooldownEnter } from "./stateHandlers/cooldownEnter.js";
import { roundStartEnter } from "./stateHandlers/roundStartEnter.js";
import { waitingForPlayerActionEnter } from "./stateHandlers/waitingForPlayerActionEnter.js";
import { waitingForPlayerActionExit } from "./stateHandlers/waitingForPlayerActionExit.js";
import { roundDecisionEnter } from "./stateHandlers/roundDecisionEnter.js";
import { roundDecisionExit } from "./stateHandlers/roundDecisionExit.js";
import { roundOverEnter } from "./stateHandlers/roundOverEnter.js";
import { matchDecisionEnter } from "./stateHandlers/matchDecisionEnter.js";
import { matchOverEnter } from "./stateHandlers/matchOverEnter.js";
import { interruptRoundEnter } from "./stateHandlers/interruptRoundEnter.js";
import { interruptMatchEnter } from "./stateHandlers/interruptMatchEnter.js";
import { roundModificationEnter } from "./stateHandlers/roundModificationEnter.js";

/**
 * Map of classic battle state handlers.
 *
 * @type {Record<string, {onEnter?: Function, onExit?: Function}>}
 */
export const stateHandlers = {
  waitingForMatchStart: { onEnter: waitingForMatchStartEnter },
  matchStart: { onEnter: matchStartEnter },
  cooldown: { onEnter: cooldownEnter },
  roundStart: { onEnter: roundStartEnter },
  waitingForPlayerAction: {
    onEnter: waitingForPlayerActionEnter,
    onExit: waitingForPlayerActionExit
  },
  roundDecision: { onEnter: roundDecisionEnter, onExit: roundDecisionExit },
  roundOver: { onEnter: roundOverEnter },
  matchDecision: { onEnter: matchDecisionEnter },
  matchOver: { onEnter: matchOverEnter },
  interruptRound: { onEnter: interruptRoundEnter },
  interruptMatch: { onEnter: interruptMatchEnter },
  roundModification: { onEnter: roundModificationEnter }
};

export default stateHandlers;
