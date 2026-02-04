import { createBattleStore, startRound } from "./roundManager.js";
import { shouldClearSelectionForNextRound } from "./selectionHandler.js";
import { initClassicBattleOrchestrator } from "./orchestrator.js";
import { applyRoundUI, handleRoundStartedEvent } from "./roundUI.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "../featureFlags.js";
import { setTestMode } from "../testModeUtils.js";
import {
  startCoolDown,
  pauseTimer,
  resumeTimer,
  createBattleEngine,
  getEngine
} from "../BattleEngine.js";
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
    this.store.waitForOutcomeConfirmation = false;
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
    this.#syncTestMode();
    this.#emitFeatureFlags();
    const handleFeatureFlagsChange = () => {
      this.#syncTestMode();
      this.#emitFeatureFlags();
    };
    featureFlagsEmitter.addEventListener("change", handleFeatureFlagsChange);

    // Create the battle engine and assign it to the store
    createBattleEngine();
    this.store.engine = getEngine();
    this.#bindEngineRoundStarted(this.store.engine);

    // Initialize orchestrator and assign it to the store
    this.store.orchestrator = await initClassicBattleOrchestrator(this.store, () =>
      this.startRound()
    );
  }

  /**
   * Emit feature flags change event to listeners.
   *
   * @private
   * @summary Emit feature flags change event with current flag checker.
   * @pseudocode
   * 1. Dispatch a `featureFlagsChange` event with the `isEnabled` function as detail.
   *
   * @returns {void}
   */
  #emitFeatureFlags() {
    this.dispatchEvent(new CustomEvent("featureFlagsChange", { detail: { isEnabled } }));
  }

  #syncTestMode() {
    setTestMode({ enabled: isEnabled("enableTestMode") });
  }

  #bindEngineRoundStarted(engine) {
    if (!engine || typeof engine.on !== "function") {
      return;
    }
    engine.on("roundStarted", (detail) => {
      const roundNumber = Number(detail?.round);
      if (!Number.isFinite(roundNumber)) {
        return;
      }
      handleRoundStartedEvent(
        {
          detail: {
            store: this.store,
            roundNumber
          }
        },
        {
          applyRoundUI: (store, round) => applyRoundUI(store, round, undefined, { skipTimer: true })
        }
      ).catch(() => {});
    });
  }

  /**
   * Perform round initialization.
   *
   * @pseudocode
   * 1. Delegate to `startRound(store)`.
   * @param {ReturnType<typeof createBattleStore>} store
   * @returns {Promise<void>}
   */
  async _performStartRound(store) {
    // Access the binding defensively: some Vitest mocks throw when a named
    // export is missing. Resolve to `undefined` in that case and treat as no-op.
    let startRoundRef;
    try {
      startRoundRef = startRound;
    } catch {
      startRoundRef = undefined;
    }
    if (typeof startRoundRef === "function") {
      await startRoundRef(store);
      if (store && typeof store === "object") {
        try {
          if (shouldClearSelectionForNextRound(store)) {
            store.selectionMade = false;
            store.__lastSelectionMade = false;
          }
        } catch {}
      }
    } else {
      return;
    }
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
      try {
        console.log("[debug] startRound perform error", error);
      } catch {}
      this.dispatchEvent(new CustomEvent("roundStartError", { detail: error }));
      throw error;
    }
    try {
      await this._awaitOpponentCard();
    } catch (error) {
      try {
        console.log("[debug] startRound awaitOpponentCard error", error);
      } catch {}
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
