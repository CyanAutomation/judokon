import { eventBus } from "../../utils/eventBus.js";
import { BATTLE_EVENTS } from "../../config/constants.js";

const BATTLE_STATES = {
  IDLE: "IDLE",
  BATTLE_STARTING: "BATTLE_STARTING",
  ROUND_STARTED: "ROUND_STARTED",
  STAT_SELECTION: "STAT_SELECTION",
  ROUND_RESOLUTION: "ROUND_RESOLUTION",
  BATTLE_ENDED: "BATTLE_ENDED"
};

class BattleStateMachine {
  constructor() {
    this.currentState = BATTLE_STATES.IDLE;
    this.currentRound = 0;
    this.maxRounds = 3; // Default, can be configured
    this.judoka = []; // Will be set during battle initialization
  }

  /**
   * Initializes the battle state machine.
   * @param {Array<Object>} judokaData - Array of judoka objects.
   * @param {number} maxRounds - Maximum number of rounds for the battle.
   */
  initBattle(judokaData, maxRounds) {
    this.judoka = judokaData;
    this.maxRounds = maxRounds;
    this.transitionTo(BATTLE_STATES.BATTLE_STARTING);
  }

  /**
   * Transitions the state machine to a new state.
   * @param {string} newState - The state to transition to.
   */
  transitionTo(newState) {
    if (this.currentState === newState) {
      return;
    }

    console.log(`Battle State: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    eventBus.publish(BATTLE_EVENTS.BATTLE_STATE_CHANGED, {
      newState,
      currentRound: this.currentRound
    });

    this._handleStateEntry(newState);
  }

  /**
   * Handles actions upon entering a new state.
   * @param {string} state - The state being entered.
   * @private
   */
  _handleStateEntry(state) {
    switch (state) {
      case BATTLE_STATES.BATTLE_STARTING:
        this.currentRound = 0;
        eventBus.publish(BATTLE_EVENTS.BATTLE_STARTED);
        break;
      case BATTLE_STATES.ROUND_STARTED:
        this.currentRound++;
        eventBus.publish(BATTLE_EVENTS.ROUND_STARTED, { round: this.currentRound });
        break;
      case BATTLE_STATES.STAT_SELECTION:
        eventBus.publish(BATTLE_EVENTS.STAT_SELECTION_PHASE_STARTED, { round: this.currentRound });
        break;
      case BATTLE_STATES.ROUND_RESOLUTION:
        eventBus.publish(BATTLE_EVENTS.ROUND_RESOLUTION_PHASE_STARTED, {
          round: this.currentRound
        });
        break;
      case BATTLE_STATES.BATTLE_ENDED:
        eventBus.publish(BATTLE_EVENTS.BATTLE_ENDED, { winner: this._determineBattleWinner() });
        break;
      default:
        break;
    }
  }

  /**
   * Advances the battle to the next round or ends the battle.
   */
  advanceRound() {
    if (this.currentRound < this.maxRounds) {
      this.transitionTo(BATTLE_STATES.ROUND_STARTED);
    } else {
      this.transitionTo(BATTLE_STATES.BATTLE_ENDED);
    }
  }

  /**
   * Determines the winner of the entire battle.
   * This is a placeholder and needs actual score tracking.
   * @returns {Object|null} The winning judoka object or null for a draw.
   * @private
   */
  _determineBattleWinner() {
    // TODO: Implement actual battle winner determination based on scores
    // For now, a placeholder
    return null;
  }

  /**
   * Returns the current state of the battle.
   * @returns {string} The current battle state.
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Returns the current round number.
   * @returns {number} The current round number.
   */
  getCurrentRound() {
    return this.currentRound;
  }
}

export const battleStateMachine = new BattleStateMachine();
export { BATTLE_STATES };
