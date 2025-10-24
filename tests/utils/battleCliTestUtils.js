import cliState from "../../src/pages/battleCLI/state.js";

/**
 * Resets the shared battle CLI state between tests.
 *
 * @pseudocode
 * 1. Clear all flags that alter handler behavior.
 * 2. Remove overlays and focus callbacks so tests start clean.
 * 3. Re-create the escape handled promise to restore default flow.
 */
export function resetCliState() {
  cliState.ignoreNextAdvanceClick = false;
  cliState.roundResolving = false;
  cliState.shortcutsReturnFocus = null;
  cliState.shortcutsOverlay = null;
  cliState.escapeHandledPromise = new Promise((resolve) => {
    cliState.escapeHandledResolve = resolve;
  });
}
