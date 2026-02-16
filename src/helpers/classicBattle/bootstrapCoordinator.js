import { emitBattleEvent } from "./battleEvents.js";
import { runDependencyBuildPhase } from "./dependencyBuildPhase.js";
import { runPreMatchViewWiringPhase, runPostMatchViewWiringPhase } from "./viewWiringPhase.js";
import { runMatchStartPhase } from "./matchStartPhase.js";

function emitLifecyclePhase(phase) {
  emitBattleEvent("classicBattle.init.lifecycle", { phase });
}

/**
 * Coordinate deterministic Classic Battle bootstrap phases.
 *
 * @param {object} phases
 * @param {() => object} phases.createStore
 * @param {(store: object) => void} [phases.onStoreCreated]
 * @param {() => Promise<void>} phases.initializeUtilities
 * @param {() => Promise<void>} phases.initializeUI
 * @param {(store: object) => Promise<void>} phases.initializeEngine
 * @param {(store: object) => Promise<void>} phases.initializeEventHandlers
 * @param {(store: object) => void} phases.wireStatBindings
 * @param {(store: object) => Promise<void>} phases.startMatch
 * @param {(store: object) => void} phases.wireControlBindings
 * @param {() => void} [phases.finalize]
 * @returns {Promise<object>}
 * @pseudocode
 * 1. Emit lifecycle markers around each major bootstrap phase.
 * 2. Run dependency build to construct store and initialize utilities, UI, engine, and event handlers.
 * 3. Run pre-match view wiring before resolving match-start policy.
 * 4. Execute match-start and then run post-match control wiring.
 * 5. Run optional finalization callback, emit completion marker, and return the initialized store.
 */
export async function runClassicBattleBootstrapCoordinator(phases) {
  emitLifecyclePhase("dependency-build:start");
  const store = await runDependencyBuildPhase({
    createStore: phases.createStore,
    onStoreCreated: phases.onStoreCreated,
    initializeUtilities: phases.initializeUtilities,
    initializeUI: phases.initializeUI,
    initializeEngine: phases.initializeEngine,
    initializeEventHandlers: phases.initializeEventHandlers
  });
  emitLifecyclePhase("dependency-build:complete");

  emitLifecyclePhase("view-wiring:pre-match:start");
  runPreMatchViewWiringPhase({ store, wireStatBindings: phases.wireStatBindings });
  emitLifecyclePhase("view-wiring:pre-match:complete");

  emitLifecyclePhase("match-start:start");
  await runMatchStartPhase({ store, startMatch: phases.startMatch });
  emitLifecyclePhase("match-start:complete");

  emitLifecyclePhase("view-wiring:post-match:start");
  runPostMatchViewWiringPhase({ store, wireControlBindings: phases.wireControlBindings });
  emitLifecyclePhase("view-wiring:post-match:complete");

  phases.finalize?.();
  emitLifecyclePhase("finalize:complete");

  return store;
}
