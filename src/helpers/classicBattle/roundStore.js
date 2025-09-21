/**
 * RoundStore - Centralized round state management for JU-DO-KON!
 *
 * Provides a single source of truth for round-related state including:
 * - Current round number
 * - Round state (cooldown, roundStart, etc.)
 * - Selected stat
 * - Round outcome
 * - Ready dispatch tracking
 *
 * @module src/helpers/classicBattle/roundStore
 */

import { emitBattleEvent } from "./battleEvents.js";

/**
 * @typedef {Object} RoundData
 * @property {number} number - Current round number (1-based)
 * @property {string} state - Current round state
 * @property {number} [startTime] - Timestamp when round started
 * @property {string} [selectedStat] - Stat selected by player
 * @property {string} [outcome] - Round outcome (win/loss/draw)
 */

/**
 * @typedef {Object} RoundStoreCallbacks
 * @property {(newState: string, oldState: string) => void} [onRoundStateChange]
 * @property {(newNumber: number, oldNumber: number) => void} [onRoundNumberChange]
 * @property {(stat: string) => void} [onStatSelected]
 * @property {(outcome: string) => void} [onRoundOutcome]
 */

/**
 * Centralized store for round state management.
 *
 * @pseudocode
 * 1. Maintain current round data in module scope
 * 2. Provide getters/setters for round properties
 * 3. Emit events for backward compatibility during migration
 * 4. Support callback subscriptions for reactive updates
 * 5. Track ready dispatch state for cooldown management
 */
class RoundStore {
  constructor() {
    /** @type {RoundData} */
    this.currentRound = {
      number: 0,
      state: "waitingForMatchStart"
    };

    /** @type {boolean} */
    this.readyDispatched = false;

    /** @type {RoundStoreCallbacks} */
    this.callbacks = {};

    /** @type {Array<{from: string, to: string, event: string, ts: number}>} */
    this.transitionLog = [];
  }

  /**
   * Get current round data snapshot.
   * @returns {RoundData} Current round state
   */
  getCurrentRound() {
    return { ...this.currentRound };
  }

  /**
   * Set the current round state.
   * @param {string} state - New round state
   * @param {string} [event] - Event that triggered the transition
   */
  setRoundState(state, event) {
    const oldState = this.currentRound.state;
    if (oldState === state) return;

    this.currentRound.state = state;
    this.currentRound.startTime = state === "roundStart" ? Date.now() : this.currentRound.startTime;

    // Log transition for debugging
    this.transitionLog.push({
      from: oldState,
      to: state,
      event: event || null,
      ts: Date.now()
    });

    // Keep only recent transitions
    if (this.transitionLog.length > 20) {
      this.transitionLog.shift();
    }

    // Notify subscribers
    if (this.callbacks.onRoundStateChange) {
      this.callbacks.onRoundStateChange(state, oldState);
    }

    // Emit legacy event for backward compatibility
    emitBattleEvent("roundStateChanged", {
      from: oldState,
      to: state,
      event
    });
  }

  /**
   * Set the current round number.
   * @param {number} number - New round number (1-based)
   */
  setRoundNumber(number) {
    const oldNumber = this.currentRound.number;
    if (oldNumber === number) return;

    this.currentRound.number = number;

    // Notify subscribers
    if (this.callbacks.onRoundNumberChange) {
      this.callbacks.onRoundNumberChange(number, oldNumber);
    }

    // Emit legacy event for backward compatibility
    emitBattleEvent("display.round.start", {
      roundNumber: number
    });
  }

  /**
   * Set the selected stat for the current round.
   * @param {string} stat - Selected stat name
   */
  setSelectedStat(stat) {
    this.currentRound.selectedStat = stat;

    // Notify subscribers
    if (this.callbacks.onStatSelected) {
      this.callbacks.onStatSelected(stat);
    }

    // Emit legacy event for backward compatibility
    emitBattleEvent("statSelected", { stat });
  }

  /**
   * Set the outcome for the current round.
   * @param {string} outcome - Round outcome
   */
  setRoundOutcome(outcome) {
    this.currentRound.outcome = outcome;

    // Notify subscribers
    if (this.callbacks.onRoundOutcome) {
      this.callbacks.onRoundOutcome(outcome);
    }

    // Emit legacy event for backward compatibility
    emitBattleEvent("roundOutcome", { outcome });
  }

  /**
   * Register callback for round state changes.
   * @param {(newState: string, oldState: string) => void} callback
   */
  onRoundStateChange(callback) {
    this.callbacks.onRoundStateChange = callback;
  }

  /**
   * Register callback for round number changes.
   * @param {(newNumber: number, oldNumber: number) => void} callback
   */
  onRoundNumberChange(callback) {
    this.callbacks.onRoundNumberChange = callback;
  }

  /**
   * Register callback for stat selection.
   * @param {(stat: string) => void} callback
   */
  onStatSelected(callback) {
    this.callbacks.onStatSelected = callback;
  }

  /**
   * Register callback for round outcomes.
   * @param {(outcome: string) => void} callback
   */
  onRoundOutcome(callback) {
    this.callbacks.onRoundOutcome = callback;
  }

  /**
   * Check if ready has been dispatched for current cooldown.
   * @returns {boolean} True if ready dispatched
   */
  isReadyDispatched() {
    return this.readyDispatched;
  }

  /**
   * Mark that ready has been dispatched for current cooldown.
   */
  markReadyDispatched() {
    this.readyDispatched = true;
  }

  /**
   * Reset ready dispatch tracking for new cooldown.
   */
  resetReadyDispatch() {
    this.readyDispatched = false;
  }

  /**
   * Get debug snapshot of current state.
   * @returns {Object} State snapshot for debugging
   */
  getStateSnapshot() {
    return {
      currentRound: this.getCurrentRound(),
      readyDispatched: this.readyDispatched,
      transitionLog: [...this.transitionLog]
    };
  }

  /**
   * Reset store to initial state (for testing).
   */
  reset() {
    this.currentRound = {
      number: 0,
      state: "waitingForMatchStart"
    };
    this.readyDispatched = false;
    this.callbacks = {};
    this.transitionLog = [];
  }
}

// Export singleton instance
export const roundStore = new RoundStore();
export default roundStore;
