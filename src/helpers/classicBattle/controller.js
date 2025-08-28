import { createBattleStore, startRound } from "./roundManager.js";
import { initClassicBattleOrchestrator } from "./orchestrator.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "../featureFlags.js";
import { startCoolDown, pauseTimer, resumeTimer } from "../battleEngineFacade.js";
import { emitBattleEvent } from "./battleEvents.js";

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

  /** @returns {ReturnType<typeof createBattleStore>} */
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
   * Perform round initialization and emit `roundStarted`.
   *
   * @pseudocode
   * 1. Delegate to `startRound(store)`.
   * 2. Dispatch a `roundStarted` event.
   *
   * @param {ReturnType<typeof createBattleStore>} store
   * @returns {Promise<void>}
   */
  async _performStartRound(store) {
    await startRound(store);
    this.dispatchEvent(new Event("roundStarted"));
  }

  /**
   * Await opponent card rendering and emit `opponentCardReady`.
   *
   * @pseudocode
   * 1. If provided, await the injected `waitForOpponentCard` callback.
   * 2. Emit `opponentCardReady` on the battle event bus and controller.
   *
   * @returns {Promise<void>}
   */
  async _awaitOpponentCard() {
    if (typeof this.waitForOpponentCard === "function") {
      await this.waitForOpponentCard();
    }
    emitBattleEvent("opponentCardReady");
    this.dispatchEvent(new Event("opponentCardReady"));
  }

  /**
   * Begin a round and wait for opponent card rendering.
   *
   * @pseudocode
   * 1. Call `_performStartRound` with the battle store; emit `roundStartError` on failure.
   * 2. Call `_awaitOpponentCard`; emit `roundStartError` on failure.
   *
   * @returns {Promise<void>}
   */
  async startRound() {
    try {
      await this._performStartRound(this.store);
    } catch (error) {
      this.dispatchEvent(new CustomEvent("roundStartError", { detail: error }));
      throw error;
    }
    try {
      await this._awaitOpponentCard();
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
