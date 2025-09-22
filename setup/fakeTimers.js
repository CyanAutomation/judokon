/**
 * Re-export canonical fake timer helpers for legacy imports.
 * This mirrors tests/setup/fakeTimers.js intentionally to avoid breaking existing call sites.
 * Update both locations together when adjusting timer helpers.
 */
export * from "../tests/setup/fakeTimers.js";
