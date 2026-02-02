/**
 * Round state tracker for classic battle flows.
 *
 * @module src/helpers/classicBattle/roundState
 */

import { guard } from "./guard.js";

/**
 * @typedef {Object} RoundData
 * @property {number} number - Current round number (1-based)
 * @property {string} state - Current round state
 * @property {number} [startTime] - Timestamp when round started
 * @property {string} [selectedStat] - Stat selected by player
 * @property {string} [outcome] - Round outcome (win/loss/draw)
 */

/**
 * @typedef {Object} RoundStateCallbacks
 * @property {(newState: string, oldState: string) => void} [onRoundStateChange]
 * @property {(newNumber: number, oldNumber: number) => void} [onRoundNumberChange]
 * @property {(stat: string) => void} [onStatSelected]
 * @property {(outcome: string) => void} [onRoundOutcome]
 */

/**
 * Centralized round state container for classic battle flows.
 *
 * @pseudocode
 * 1. Store round metadata in module scope.
 * 2. Provide setters/getters with optional callbacks.
 * 3. Keep minimal transition history for diagnostics.
 * 4. Track readiness dispatch state for cooldown logic.
 */
export const roundState = {
  /** @type {RoundData} */
  currentRound: {
    number: 1,
    state: "waitingForMatchStart"
  },

  /** @type {boolean} */
  readyDispatched: false,

  /** @type {RoundStateCallbacks} */
  callbacks: {},

  /** @type {Array<{from: string, to: string, event: string | null, ts: number}>} */
  transitionLog: [],

  /** @type {((newNumber: number, oldNumber: number) => void) | null} */
  scoreboardRoundNumberHandler: null,

  /** @type {((newNumber: number, oldNumber: number) => void) | null} */
  previousRoundNumberCallback: null,

  /**
   * Get current round data snapshot.
   * @returns {RoundData} Current round state
   */
  getCurrentRound() {
    return { ...roundState.currentRound };
  },

  /**
   * Set the current round state.
   * @param {string} state - New round state
   * @param {string} [event] - Event that triggered the transition
   */
  setRoundState(state, event) {
    const oldState = roundState.currentRound.state;
    if (oldState === state) return;

    roundState.currentRound.state = state;
    roundState.currentRound.startTime =
      state === "roundPrompt" ? Date.now() : roundState.currentRound.startTime;

    roundState.transitionLog.push({
      from: oldState,
      to: state,
      event: event || null,
      ts: Date.now()
    });

    if (roundState.transitionLog.length > 20) {
      roundState.transitionLog.shift();
    }

    if (roundState.callbacks.onRoundStateChange) {
      roundState.callbacks.onRoundStateChange(state, oldState);
    }
  },

  /**
   * Set the current round number.
   *
   * @pseudocode
   * 1. Normalize options to an object before destructuring.
   * 2. Exit early when number remains unchanged.
   * 3. Notify subscribers of the new round number.
   *
   * @param {number} number - New round number (1-based, zero allowed for pre-match state)
   * @param {{ emitLegacyEvent?: boolean }} [options] - Optional behavior overrides
   */
  setRoundNumber(number, options = {}) {
    const safeOptions = typeof options === "object" && options !== null ? options : {};
    const { emitLegacyEvent = true } = safeOptions;
    void emitLegacyEvent;
    const oldNumber = roundState.currentRound.number;
    if (oldNumber === number) return;

    roundState.currentRound.number = number;

    if (roundState.callbacks.onRoundNumberChange) {
      roundState.callbacks.onRoundNumberChange(number, oldNumber);
    }

    // Note: Legacy event emission removed as per refactoring goals
  },

  /**
   * Set the selected stat for the current round.
   * @param {string} stat - Selected stat name
   * @param {{ emitLegacyEvent?: boolean }} [options]
   */
  setSelectedStat(stat, options = {}) {
    const safeOptions = typeof options === "object" && options !== null ? options : {};
    const { emitLegacyEvent = true } = safeOptions;
    void emitLegacyEvent;

    roundState.currentRound.selectedStat = stat;

    if (roundState.callbacks.onStatSelected) {
      roundState.callbacks.onStatSelected(stat);
    }

    // Note: Legacy event emission removed as per refactoring goals
  },

  /**
   * Set the outcome for the current round.
   * @param {string} outcome - Round outcome
   */
  setRoundOutcome(outcome) {
    roundState.currentRound.outcome = outcome;

    if (roundState.callbacks.onRoundOutcome) {
      roundState.callbacks.onRoundOutcome(outcome);
    }
  },

  /**
   * Register callback for round state changes.
   * @param {(newState: string, oldState: string) => void} callback
   */
  onRoundStateChange(callback) {
    roundState.callbacks.onRoundStateChange = callback;
  },

  /**
   * Register callback for round number changes.
   * @param {(newNumber: number, oldNumber: number) => void} callback
   */
  onRoundNumberChange(callback) {
    roundState.callbacks.onRoundNumberChange = callback;
  },

  /**
   * Register callback for stat selection.
   * @param {(stat: string) => void} callback
   */
  onStatSelected(callback) {
    roundState.callbacks.onStatSelected = callback;
  },

  /**
   * Register callback for round outcomes.
   * @param {(outcome: string) => void} callback
   */
  onRoundOutcome(callback) {
    roundState.callbacks.onRoundOutcome = callback;
  },

  /**
   * Check if ready has been dispatched for current cooldown.
   * @returns {boolean} True if ready dispatched
   */
  isReadyDispatched() {
    return roundState.readyDispatched;
  },

  /**
   * Mark that ready has been dispatched for current cooldown.
   */
  markReadyDispatched() {
    roundState.readyDispatched = true;
  },

  /**
   * Reset ready dispatch tracking for new cooldown.
   */
  resetReadyDispatch() {
    roundState.readyDispatched = false;
  },

  /**
   * Get debug snapshot of current state.
   * @returns {Object} State snapshot for debugging
   */
  getStateSnapshot() {
    return {
      currentRound: roundState.getCurrentRound(),
      readyDispatched: roundState.readyDispatched,
      transitionLog: [...roundState.transitionLog]
    };
  },

  /**
   * Reset store to initial state.
   *
   * @pseudocode
   * 1. Restore to pre-match baseline and set next visible round to 1.
   * 2. Clear readiness flags, callbacks, and transition log entries.
   *
   * Ensures the engine and scoreboard both reflect the pre-match round 1 state.
   */
  reset() {
    roundState.currentRound = {
      number: 1,
      state: "waitingForMatchStart",
      selectedStat: undefined,
      outcome: undefined,
      startTime: undefined
    };
    roundState.readyDispatched = false;
    roundState.callbacks = {};
    roundState.transitionLog = [];
    roundState.scoreboardRoundNumberHandler = null;
    roundState.previousRoundNumberCallback = null;
  },

  /**
   * Wire round state into scoreboard adapter.
   * This replaces event-driven round number updates with direct subscriptions.
   *
   * @param {(roundNumber: number) => void} [updateRoundCounter]
   * @param {() => void} [clearRoundCounter]
   * @returns {Promise<void>} Resolved promise for scoreboard ready chaining
   */
  wireIntoScoreboardAdapter(params = {}) {
    const safeParams = typeof params === "object" && params !== null ? params : {};
    const { updateRoundCounter, clearRoundCounter } = safeParams;

    const safeUpdate = typeof updateRoundCounter === "function" ? updateRoundCounter : () => {};
    const safeClear =
      typeof clearRoundCounter === "function"
        ? () => {
            clearRoundCounter();
          }
        : () => {
            safeUpdate(0);
          };

    const applyRoundNumber = (roundNumber) => {
      if (typeof roundNumber === "number" && Number.isFinite(roundNumber) && roundNumber >= 0) {
        guard(() => safeUpdate(roundNumber));
        return;
      }

      guard(() => safeClear());
    };

    const existingRoundNumberCallback =
      roundState.callbacks.onRoundNumberChange === roundState.scoreboardRoundNumberHandler
        ? roundState.previousRoundNumberCallback
        : roundState.callbacks.onRoundNumberChange;

    const scoreboardRoundNumberHandler = (newNumber, oldNumber) => {
      applyRoundNumber(newNumber);

      if (typeof existingRoundNumberCallback === "function") {
        guard(() => existingRoundNumberCallback(newNumber, oldNumber));
      }
    };

    roundState.previousRoundNumberCallback = existingRoundNumberCallback || null;
    roundState.scoreboardRoundNumberHandler = scoreboardRoundNumberHandler;
    roundState.callbacks.onRoundNumberChange = scoreboardRoundNumberHandler;

    applyRoundNumber(roundState.currentRound.number);

    return Promise.resolve();
  },

  /**
   * Disconnect round state from scoreboard adapter.
   * Removes the round number change callback that was set up for scoreboard integration.
   */
  disconnectFromScoreboardAdapter() {
    if (roundState.callbacks.onRoundNumberChange === roundState.scoreboardRoundNumberHandler) {
      roundState.callbacks.onRoundNumberChange = roundState.previousRoundNumberCallback;
    }

    roundState.scoreboardRoundNumberHandler = null;
    roundState.previousRoundNumberCallback = null;
  }
};

export default roundState;
