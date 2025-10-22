/**
 * Sets up opponent delay control utilities for battle tests.
 *
 * @param {Object} testApi - The test API object containing timer controls.
 * @returns {Object} Object with {@link setOpponentDelayToZero} and {@link resetOpponentDelay} helpers.
 *
 * @pseudocode
 * setupOpponentDelayControl(testApi):
 *   1. Extract timer API from test API
 *   2. Check if delay control is available
 *   3. Return object with delay control methods
 *   4. Methods safely call setOpponentResolveDelay() if available
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
