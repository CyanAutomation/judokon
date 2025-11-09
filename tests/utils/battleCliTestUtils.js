/**
 * Resets the shared battle CLI state between tests.
 *
 * @pseudocode
 * 1. Clear all flags that alter handler behavior.
 * 2. Remove overlays and focus callbacks so tests start clean.
 * 3. Re-create the escape key handled promise to restore default async flow.
 */
export async function resetCliState() {
  // Dynamically import to get the current instance after mocks are set up
  const { default: cliState } = await import("../../src/pages/battleCLI/state.js");

  cliState.ignoreNextAdvanceClick = false;
  cliState.roundResolving = false;
  cliState.shortcutsReturnFocus = null;
  cliState.shortcutsOverlay = null;
  cliState.escapeHandledPromise = new Promise((resolve) => {
    cliState.escapeHandledResolve = resolve;
  });
}
