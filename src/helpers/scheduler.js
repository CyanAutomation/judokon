let currentScheduler = {
  setTimeout: (...args) => globalThis.setTimeout(...args),
  clearTimeout: (...args) => globalThis.clearTimeout(...args),
};

// Keep realScheduler for any code that might still use it directly.
export const realScheduler = currentScheduler;

export function getScheduler() {
  return currentScheduler;
}

export function setScheduler(newScheduler) {
  if (!newScheduler || typeof newScheduler.setTimeout !== 'function') {
    throw new Error('Invalid scheduler provided.');
  }
  currentScheduler = newScheduler;
}