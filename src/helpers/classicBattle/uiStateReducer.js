import { emitBattleEvent } from "./battleEvents.js";
import { isCanonicalState, phaseFromCanonicalState } from "./statePhases.js";

const HIDDEN_OPPONENT_STATES = new Set([
  "waitingForMatchStart",
  "matchStart",
  "roundWait",
  "roundPrompt",
  "roundSelect"
]);

const DISABLE_STAT_BUTTON_STATES = new Set([
  "waitingForMatchStart",
  "matchStart",
  "roundWait",
  "roundPrompt",
  "roundResolve",
  "roundDisplay",
  "matchEvaluate",
  "matchDecision",
  "matchOver",
  "interruptRound",
  "interruptMatch",
  "roundModification"
]);

function getBody() {
  if (typeof document === "undefined") return null;
  return document.body || null;
}

function setBattleModeClass(body, state) {
  const previous = body.dataset?.uiModeClass;
  if (previous) {
    body.classList.remove(previous);
  }
  const nextClass = state ? `battle-mode-${String(state)}` : "battle-mode-unknown";
  body.classList.add(nextClass);
  body.dataset.uiModeClass = nextClass;
}

function setOpponentVisibilityForState(state) {
  if (typeof document === "undefined") return;
  const container = document.getElementById("opponent-card");
  if (!container?.classList) return;
  if (HIDDEN_OPPONENT_STATES.has(state)) {
    container.classList.add("opponent-hidden");
  } else {
    container.classList.remove("opponent-hidden");
  }
}

function setStatButtonsEnabledForState(state) {
  if (DISABLE_STAT_BUTTON_STATES.has(state)) {
    emitBattleEvent("statButtons:disable", { source: "uiStateReducer", state });
    return;
  }
  emitBattleEvent("statButtons:enable", { source: "uiStateReducer", state });
}

/**
 * Apply canonical UI mode changes from authoritative control state transitions.
 *
 * @param {{from?: string|null,to?: string|null}} detail
 * @returns {void}
 * @pseudocode
 * 1. Validate the target state from `detail.to`.
 * 2. Mirror the state to body dataset/attributes and mode class.
 * 3. Route enabled/disabled control state changes through stat button events.
 * 4. Route opponent visibility classes from the control state.
 */
export function applyControlStateTransition(detail = {}) {
  const to = detail?.to;
  if (!isCanonicalState(to)) return;

  const body = getBody();
  if (body) {
    if (detail?.from) {
      body.dataset.prevBattleState = String(detail.from);
    } else {
      delete body.dataset.prevBattleState;
    }
    body.dataset.battleState = to;
    body.setAttribute("data-battle-state", to);
    const phase = phaseFromCanonicalState(to);
    if (phase) body.dataset.battlePhase = phase;
    else delete body.dataset.battlePhase;
    setBattleModeClass(body, to);
  }

  setStatButtonsEnabledForState(to);
  setOpponentVisibilityForState(to);
}

/**
 * Apply opponent card visibility classes using reducer-owned logic.
 *
 * @param {Element|null|undefined} container
 * @param {{visible?: boolean}} [options]
 * @returns {void}
 * @pseudocode
 * 1. Exit when `container` has no classList API.
 * 2. Add `opponent-hidden` when `options.visible` is explicitly false.
 * 3. Otherwise remove `opponent-hidden`.
 */
export function setOpponentCardVisibility(container, options = {}) {
  if (!container?.classList) return;
  if (options.visible === false) {
    container.classList.add("opponent-hidden");
    return;
  }
  container.classList.remove("opponent-hidden");
}
