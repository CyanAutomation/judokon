/**
 * Default configuration for Classic Battle.
 *
 * @pseudocode
 * 1. Export `POINTS_TO_WIN_OPTIONS` for modal choices.
 * 2. Export `DEFAULT_POINTS_TO_WIN` used when no prior selection exists.
 * 3. Export `FEATURE_FLAGS` defaults scoped to Classic Battle.
 *
 * Note on feature flag names: canonical keys use camelCase (e.g., `autoSelect`,
 * `statHotkeys`). Older docs may reference FF_* names; prefer camelCase going forward.
 */
export const POINTS_TO_WIN_OPTIONS = [5, 10, 15];
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export const DEFAULT_POINTS_TO_WIN = 10;
export const FEATURE_FLAGS = {
  autoSelect: { enabled: true },
  battleDebugPanel: { enabled: false },
  enableTestMode: { enabled: false },
  battleStateBadge: { enabled: false },
  statHotkeys: { enabled: false }
};
