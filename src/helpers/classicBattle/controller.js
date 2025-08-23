import { createBattleStore, startRound } from "./roundManager.js";
import { initClassicBattleOrchestrator } from "./orchestrator.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "../featureFlags.js";
import { startCoolDown, pauseTimer, resumeTimer } from "../battleEngineFacade.js";

/**
 * Controller for Classic Battle mode.
 *
 * @pseudocode
 * 1. Create a battle store via `createBattleStore`.
 * 2. Initialize feature flags and re‑emit changes.
 * 3. Start the battle orchestrator.
 * 4. Expose `startRound` which waits for the opponent card via an injected callback.
 */
export class ClassicBattleController extends EventTarget {
  /**
   * @param {{waitForOpponentCard?: () => Promise<void>}} [deps]
   */
  constructor({ waitForOpponentCard } = {}) {
    super();
    this.store = createBattleStore();
    this.waitForOpponentCard = waitForOpponentCard;
    this.timerControls = { startCoolDown, pauseTimer, resumeTimer };
  }

  /** @returns {import("./roundManager.js").BattleStore} */
  get battleStore() {
    return this.store;
  }

  /**
   * Initialize feature flags and orchestrator.
   * @returns {Promise<void>}
   */
  async init() {
    await initFeatureFlags();
    this.#emitFeatureFlags();
    featureFlagsEmitter.addEventListener("change", () => this.#emitFeatureFlags());
    await initClassicBattleOrchestrator(this.store, () => this.startRound());
  }

  #emitFeatureFlags() {
    this.dispatchEvent(new CustomEvent("featureFlagsChange", { detail: { isEnabled } }));
  }

  /**
   * Begin a round and wait for opponent card rendering.
   * @returns {Promise<void>}
   */
  async startRound() {
    try {
      await startRound(this.store);
      if (typeof this.waitForOpponentCard === "function") {
        await this.waitForOpponentCard();
      }
      this.dispatchEvent(new Event("roundStart"));
    } catch (error) {
      this.dispatchEvent(new CustomEvent("roundStartError", { detail: error }));
      throw error;
    }
  }

  /**
   * Proxy feature flag checks to the underlying service.
   * @param {string} flag
   * @returns {boolean}
   */
  isEnabled(flag) {
    return isEnabled(flag);
  }
}

export default ClassicBattleController;
