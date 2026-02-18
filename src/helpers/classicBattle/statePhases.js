import { order as catalogOrder } from "./stateCatalog.js";
import { CLASSIC_BATTLE_STATES, ROUND_MODIFICATION_OVERLAY_STATES } from "./stateTable.js";

const tableOrder = CLASSIC_BATTLE_STATES.map((state) => state.name);
const overlayOrder = ROUND_MODIFICATION_OVERLAY_STATES.map((state) => state.name);

/**
 * Canonical Classic Battle state names in stable order.
 *
 * @type {readonly string[]}
 */
export const CANONICAL_STATE_ORDER = Object.freeze([...new Set([...catalogOrder, ...tableOrder])]);

/**
 * Membership set for canonical states, including optional overlay states.
 *
 * @type {Set<string>}
 */
export const CANONICAL_STATE_SET = new Set([...CANONICAL_STATE_ORDER, ...overlayOrder]);

/**
 * Derive grouped UI phase labels from canonical machine states.
 *
 * @param {unknown} state
 * @returns {"lobby"|"round"|"match"|"interrupt"|"admin"|null}
 * @pseudocode
 * 1. Validate that `state` is a canonical Classic Battle state.
 * 2. Map canonical state names to broad presentation-only phases.
 * 3. Return `null` for unknown states.
 */
export function phaseFromCanonicalState(state) {
  if (!isCanonicalState(state)) return null;

  switch (state) {
    case "waitingForMatchStart":
    case "matchStart":
      return "lobby";
    case "roundWait":
    case "roundPrompt":
    case "roundSelect":
    case "roundResolve":
    case "roundDisplay":
      return "round";
    case "matchEvaluate":
    case "matchDecision":
    case "matchOver":
      return "match";
    case "interruptRound":
    case "interruptMatch":
      return "interrupt";
    case "roundModification":
      return "admin";
    default:
      return null;
  }
}

/**
 * Determine whether a value is a canonical Classic Battle state.
 *
 * @param {unknown} state
 * @returns {state is string}
 * @pseudocode
 * 1. Ensure `state` is a string.
 * 2. Check membership in the canonical state set.
 * 3. Return true only when both checks pass.
 */
export function isCanonicalState(state) {
  return typeof state === "string" && CANONICAL_STATE_SET.has(state);
}
