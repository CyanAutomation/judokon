export function createTimerIdFactory() {
  let current = 0;
  return () => {
    current += 1;
    return current;
  };
}

export function createTimerIdManager() {
  let nextTimeoutIdFactory = createTimerIdFactory();
  let nextIntervalIdFactory = createTimerIdFactory();

  return {
    reset() {
      nextTimeoutIdFactory = createTimerIdFactory();
      nextIntervalIdFactory = createTimerIdFactory();
    },
    getNextTimeoutId() {
      return nextTimeoutIdFactory();
    },
    getNextIntervalId() {
      return nextIntervalIdFactory();
    }
  };
}

export function cleanupTimers(timer, interval) {
  if (timer) {
    if (typeof timer.stop === "function") {
      timer.stop();
    } else {
      clearTimeout(timer);
    }
  }
  if (interval) {
    clearInterval(interval);
  }
}
