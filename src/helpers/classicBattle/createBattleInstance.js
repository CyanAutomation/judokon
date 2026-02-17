import { createBattleEventBus, setActiveBattleEventBus } from "./battleEvents.js";
import { initClassicBattleOrchestrator, disposeClassicBattleOrchestrator } from "./orchestrator.js";
import { ensureClassicBattleScheduler } from "./timingScheduler.js";

/**
 * Build an isolated Classic Battle match instance.
 *
 * @param {{
 *   orchestratorInit?: typeof initClassicBattleOrchestrator,
 *   orchestratorDispose?: typeof disposeClassicBattleOrchestrator,
 *   battleEventBus?: ReturnType<typeof createBattleEventBus>,
 *   scheduler?: import('./timingScheduler.js').ClassicBattleScheduler
 * }} [options]
 * @returns {{
 *   machine: import('./stateManager.js').ClassicBattleStateManager|null,
 *   eventBus: ReturnType<typeof createBattleEventBus>,
 *   dispatchIntent: (eventName: string, payload?: any) => Promise<{accepted: boolean, rejected: boolean, reason?: string, result?: unknown, error?: Error}>,
 *   init: (contextOverrides?: object, dependencies?: object|Function, hooks?: object|Function) => Promise<any>,
 *   dispose: () => void
 * }}
 * @summary Create per-match wiring for machine, event bus, and lifecycle cleanup.
 * @pseudocode
 * 1. Create or use the provided event bus.
 * 2. Activate the bus so existing battle modules route through this match.
 * 3. Initialize orchestrator with the selected bus and keep a machine reference.
 * 4. Provide dispatch and dispose helpers scoped to the match lifecycle.
 */
export function createBattleInstance(options = {}) {
  const orchestratorInit = options.orchestratorInit ?? initClassicBattleOrchestrator;
  const orchestratorDispose = options.orchestratorDispose ?? disposeClassicBattleOrchestrator;
  const eventBus = options.battleEventBus ?? createBattleEventBus();
  const scheduler = ensureClassicBattleScheduler(options.scheduler);

  let machine = null;

  /**
   * Dispatch a state-machine intent through the active battle instance.
   *
   * @param {string} eventName
   * @param {any} [payload]
   * @returns {Promise<{accepted: boolean, rejected: boolean, reason?: string, result?: unknown, error?: Error}>}
   * @pseudocode
   * validate intent name and machine availability
   * dispatch intent through machine.dispatch with optional payload
   * map falsy machine acceptance to standardized rejected contract
   * return accepted/rejected schema and include rejection reason
   */
  async function dispatchIntent(eventName, payload) {
    if (typeof eventName !== "string" || eventName.length === 0) {
      return {
        accepted: false,
        rejected: true,
        reason: "invalid_intent"
      };
    }

    if (!machine?.dispatch) {
      return {
        accepted: false,
        rejected: true,
        reason: "no_machine"
      };
    }

    try {
      const result =
        payload === undefined
          ? await machine.dispatch(eventName)
          : await machine.dispatch(eventName, payload);
      const accepted = result !== false;
      return accepted
        ? {
            accepted: true,
            rejected: false,
            result
          }
        : {
            accepted: false,
            rejected: true,
            reason: "intent_rejected",
            result
          };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      return {
        accepted: false,
        rejected: true,
        reason: "dispatch_exception",
        error: normalized
      };
    }
  }

  async function init(contextOverrides = {}, dependencies = {}, hooks = {}) {
    setActiveBattleEventBus(eventBus);
    const resolvedDependencies = {
      scheduler,
      ...(dependencies || {})
    };
    machine = await orchestratorInit(contextOverrides, resolvedDependencies, hooks, {
      battleEventBus: eventBus
    });
    return machine;
  }

  function dispose() {
    orchestratorDispose();
    machine = null;
    eventBus.dispose();
    setActiveBattleEventBus(createBattleEventBus());
  }

  return {
    get machine() {
      return machine;
    },
    eventBus,
    dispatchIntent,
    init,
    dispose
  };
}
