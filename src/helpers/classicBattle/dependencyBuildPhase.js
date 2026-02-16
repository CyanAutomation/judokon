/**
 * Execute dependency/bootstrap construction for Classic Battle.
 *
 * @param {object} options
 * @param {() => object} options.createStore
 * @param {(store: object) => void} [options.onStoreCreated]
 * @param {() => Promise<void>} options.initializeUtilities
 * @param {() => Promise<void>} options.initializeUI
 * @param {(store: object) => Promise<void>} options.initializeEngine
 * @param {(store: object) => Promise<void>} options.initializeEventHandlers
 * @returns {Promise<object>}
 * @pseudocode
 * 1. Create the battle store via the provided constructor callback.
 * 2. Publish the store through `onStoreCreated` when supplied.
 * 3. Run utilities, UI, engine, and event-handler initializers in order.
 * 4. Return the initialized store for downstream phases.
 */
export async function runDependencyBuildPhase({
  createStore,
  onStoreCreated,
  initializeUtilities,
  initializeUI,
  initializeEngine,
  initializeEventHandlers
}) {
  const store = createStore();
  onStoreCreated?.(store);

  await initializeUtilities();
  await initializeUI();
  await initializeEngine(store);
  await initializeEventHandlers(store);

  return store;
}
