/**
 * Execute match-start policy resolution for Classic Battle.
 *
 * @param {object} options
 * @param {object} options.store
 * @param {(store: object) => Promise<void>} options.startMatch
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Call the provided match-start callback with the prepared store.
 * 2. Await completion before returning to the caller.
 */
export async function runMatchStartPhase({ store, startMatch }) {
  await startMatch(store);
}
