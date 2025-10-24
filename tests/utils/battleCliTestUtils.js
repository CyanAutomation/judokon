import cliState from "../../src/pages/battleCLI/state.js";

export function resetCliState() {
  cliState.ignoreNextAdvanceClick = false;
  cliState.roundResolving = false;
  cliState.shortcutsReturnFocus = null;
  cliState.shortcutsOverlay = null;
  cliState.escapeHandledPromise = new Promise((resolve) => {
    cliState.escapeHandledResolve = resolve;
  });
}
