/**
 * Custom event emitted when the Classic Battle store is assigned.
 *
 * @type {"classicBattle:store-ready"}
 */
export const STORE_READY_EVENT = "classicBattle:store-ready";

/**
 * Poll interval used as a bounded fallback when waiting for store readiness.
 *
 * @type {25}
 */
export const STORE_POLL_INTERVAL_MS = 25;

/**
 * Maximum polling attempts before store-readiness fallback times out.
 *
 * @type {80}
 */
export const STORE_POLL_MAX_ATTEMPTS = 80;
