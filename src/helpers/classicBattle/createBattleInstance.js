import { createBattleEventBus, setActiveBattleEventBus } from "./battleEvents.js";
import { initClassicBattleOrchestrator, disposeClassicBattleOrchestrator } from "./orchestrator.js";
import { dispatchBattleEvent } from "./eventBus.js";
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
 *   dispatchIntent: (eventName: string, payload?: any) => Promise<void>,
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
    dispatchIntent: async (eventName, payload) => dispatchBattleEvent(eventName, payload),
    init,
    dispose
  };
}
