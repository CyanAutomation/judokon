import { warn as logWarn } from "../logger.js";

export const INTERNAL_ROUND_MODIFICATION_CONFIG = "enableRoundModificationOverlay";
const INTERNAL_ROUND_MODIFICATION_GLOBAL_GUARD = "__JUDOKON_ALLOW_INTERNAL_ROUND_MODIFICATION__";

function isInternalGuardEnabled() {
  return (
    typeof globalThis !== "undefined" &&
    globalThis[INTERNAL_ROUND_MODIFICATION_GLOBAL_GUARD] === true
  );
}

/**
 * Determine whether internal admin controls explicitly enable round modification.
 *
 * This toggle is intentionally internal-only and must be injected via orchestrator
 * context overrides in dev/test harnesses. It is not read from persisted user
 * settings or global feature flags.
 *
 * Guardrails:
 * - Requires `context.internalConfig.enableRoundModificationOverlay === true`.
 * - Requires a runtime global gate `globalThis.__JUDOKON_ALLOW_INTERNAL_ROUND_MODIFICATION__ === true`.
 *
 * @param {object} [context]
 * @returns {boolean} True when internal/admin round modification is enabled.
 * @pseudocode
 * 1. Ignore legacy public flag source (`context.flags.roundModify`) and warn.
 * 2. Read explicit internal config from `context.internalConfig`.
 * 3. Require the runtime global guard to be enabled.
 * 4. Warn and return false if config is set but the runtime guard is not set.
 */
export function isInternalRoundModificationEnabled(context = {}) {
  if (context?.flags && Object.prototype.hasOwnProperty.call(context.flags, "roundModify")) {
    logWarn(
      "Ignoring deprecated context.flags.roundModify; use context.internalConfig.enableRoundModificationOverlay instead"
    );
  }

  const internalConfigEnabled =
    context?.internalConfig?.[INTERNAL_ROUND_MODIFICATION_CONFIG] === true;
  const runtimeGateEnabled = isInternalGuardEnabled();

  if (internalConfigEnabled && !runtimeGateEnabled) {
    logWarn(
      "Blocking internal round modification overlay: missing globalThis.__JUDOKON_ALLOW_INTERNAL_ROUND_MODIFICATION__ runtime guard"
    );
    return false;
  }

  return internalConfigEnabled && runtimeGateEnabled;
}

/**
 * Determine if the round modification overlay is enabled.
 *
 * @param {object} [context]
 * @returns {boolean} True when the overlay should be available.
 * @pseudocode
 * 1. Delegate to internal-only round modification gate resolution.
 */
export function isRoundModificationOverlayEnabled(context = {}) {
  return isInternalRoundModificationEnabled(context);
}
