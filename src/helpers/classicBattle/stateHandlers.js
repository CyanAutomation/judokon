import { waitingForMatchStartEnter } from "./stateHandlers/waitingForMatchStartEnter.js";
import { matchStartEnter } from "./stateHandlers/matchStartEnter.js";
import { roundWaitEnter } from "./stateHandlers/roundWaitEnter.js";
import { roundPromptEnter } from "./stateHandlers/roundPromptEnter.js";
import { roundSelectEnter } from "./stateHandlers/roundSelectEnter.js";
import { roundSelectExit } from "./stateHandlers/roundSelectExit.js";
import { roundResolveEnter } from "./stateHandlers/roundResolveEnter.js";
import { roundResolveExit } from "./stateHandlers/roundResolveExit.js";
import { roundDisplayEnter } from "./stateHandlers/roundDisplayEnter.js";
import { matchEvaluateEnter } from "./stateHandlers/matchEvaluateEnter.js";
import { matchDecisionEnter } from "./stateHandlers/matchDecisionEnter.js";
import { matchOverEnter } from "./stateHandlers/matchOverEnter.js";
import { interruptRoundEnter } from "./stateHandlers/interruptRoundEnter.js";
import { interruptMatchEnter } from "./stateHandlers/interruptMatchEnter.js";
import { roundModificationEnter } from "./stateHandlers/roundModificationEnter.js";

/**
 * Map of classic battle state handlers.
 *
 * @type {Record<string, {onEnter?: Function, onExit?: Function}>}
 * @pseudocode
 * 1. Import individual handler functions (onEnter/onExit) from ./stateHandlers/ directory
 * 2. Build a record mapping state names (strings) to handler objects
 *    - Each state name maps to {onEnter?: Function, onExit?: Function}
 *    - onEnter is called when entering the state
 *    - onExit is called when exiting the state (if defined)
 * 3. Export as default and named export for use by state machine
 */
export const stateHandlers = {
  waitingForMatchStart: { onEnter: waitingForMatchStartEnter },
  matchStart: { onEnter: matchStartEnter },
  roundWait: { onEnter: roundWaitEnter },
  roundPrompt: { onEnter: roundPromptEnter },
  roundSelect: {
    onEnter: roundSelectEnter,
    onExit: roundSelectExit
  },
  roundResolve: { onEnter: roundResolveEnter, onExit: roundResolveExit },
  roundDisplay: { onEnter: roundDisplayEnter },
  matchEvaluate: { onEnter: matchEvaluateEnter },
  matchDecision: { onEnter: matchDecisionEnter },
  matchOver: { onEnter: matchOverEnter },
  interruptRound: { onEnter: interruptRoundEnter },
  interruptMatch: { onEnter: interruptMatchEnter }
};

export const roundModificationOverlayHandlers = {
  roundModification: { onEnter: roundModificationEnter }
};

export default stateHandlers;
