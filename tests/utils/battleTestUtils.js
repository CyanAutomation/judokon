/**
 * Shared utilities for Battle Classic integration tests.
 */
export function setupOpponentDelayControl(testApi) {
  const timerApi = testApi?.timers;
  const canControlDelay = typeof timerApi?.setOpponentResolveDelay === "function";

  const setDelay = (value) => {
    if (canControlDelay) {
      timerApi.setOpponentResolveDelay(value);
    }
  };

  return {
    setOpponentDelayToZero() {
      setDelay(0);
    },
    resetOpponentDelay() {
      setDelay(null);
    }
  };
}
