import { expect, vi } from "vitest";

const GLOBAL_TARGETS = [globalThis, typeof window !== "undefined" ? window : undefined];

export function createScoreboardStub() {
  return {
    clearTimer: vi.fn(),
    showMessage: vi.fn(),
    showAutoSelect: vi.fn(),
    showTemporaryMessage: vi.fn(() => vi.fn()),
    updateTimer: vi.fn(),
    updateRoundCounter: vi.fn(),
    clearRoundCounter: vi.fn()
  };
}

export function createSnackbarStub() {
  return {
    showSnackbar: vi.fn(),
    updateSnackbar: vi.fn()
  };
}

export function createGlobalStateManager() {
  const tracked = new Map();

  return {
    setup(overrides) {
      Object.entries(overrides).forEach(([key, value]) => {
        if (!tracked.has(key)) {
          const entries = GLOBAL_TARGETS.filter(Boolean).map((target) => ({
            target,
            key,
            hadOwn: Object.prototype.hasOwnProperty.call(target, key),
            previousValue: target[key]
          }));

          tracked.set(key, entries);
        }

        const entries = tracked.get(key) ?? [];
        entries.forEach(({ target }) => {
          target[key] = value;
        });
      });
    },
    restore() {
      tracked.forEach((entries, key) => {
        entries.forEach(({ target, hadOwn, previousValue }) => {
          if (!target) {
            return;
          }

          if (hadOwn) {
            target[key] = previousValue;
          } else {
            delete target[key];
          }
        });
      });

      tracked.clear();
    }
  };
}

export function setupCooldownTestDOM() {
  const { innerHTML: previousInnerHTML } = document.body;
  const previousBattleState = document.body.dataset?.battleState;
  const hadBattleState = typeof document.body.dataset?.battleState !== "undefined";

  document.body.innerHTML =
    '<button id="next-button" data-role="next-round" disabled data-next-ready="false"></button>';

  if (document.body.dataset) {
    delete document.body.dataset.battleState;
  }

  return () => {
    document.body.innerHTML = previousInnerHTML;

    if (!document.body.dataset) {
      return;
    }

    if (hadBattleState) {
      document.body.dataset.battleState = previousBattleState ?? "";
    } else {
      delete document.body.dataset.battleState;
    }
  };
}

export function readTraceEntries(traceName) {
  const trace = globalThis.__classicBattleDebugRead?.(traceName) ?? [];
  return Array.isArray(trace) ? trace : [];
}

export function expectTraceToIncludeEvents(traceEntries, expectedEvents) {
  expect(Array.isArray(traceEntries)).toBe(true);

  const traceEvents = traceEntries.map((entry) => entry.event);
  expectedEvents.forEach((eventName) => {
    expect(traceEvents).toContain(eventName);
  });
}
