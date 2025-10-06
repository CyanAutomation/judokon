/**
 * Private test fixture for deterministic quick wins in battle tests.
 * This is test-only and should not be used in production code.
 */

// Simulate a quick win by dispatching a win event
export function triggerQuickWin() {
  window.__TEST_API.state.dispatchBattleEvent('quickWin');
}
