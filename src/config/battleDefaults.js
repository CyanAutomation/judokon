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
 * Default points-to-win used when no prior value is stored.
 *
 * @summary Default target points for Classic Battle matches.
 * @pseudocode
 * 1. Provide a default numeric target used to initialize UI controls and game logic.
 * 2. Consumers should read and persist user selections separately.
 * @returns {number}
 */
export const DEFAULT_POINTS_TO_WIN = 10;
export const FEATURE_FLAGS = {
  autoSelect: { enabled: true },
  enableTestMode: { enabled: false },
  battleStateBadge: { enabled: false },
  battleStateProgress: { enabled: false },
  statHotkeys: { enabled: false }
};
