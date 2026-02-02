import { isEnabled } from "../featureFlags.js";

/**
 * Determine if the round modification overlay is enabled.
 *
 * @param {object} [context]
 * @returns {boolean} True when the overlay should be available.
 * @pseudocode
 * 1. Prefer explicit context flag overrides when provided.
 * 2. Fall back to the global feature flag.
 */
export function isRoundModificationOverlayEnabled(context = {}) {
  if (context?.flags && Object.prototype.hasOwnProperty.call(context.flags, "roundModify")) {
    return Boolean(context.flags.roundModify);
  }
  return Boolean(isEnabled("roundModify"));
}
