import { describe, it, expect } from "vitest";

function createListenerTracker() {
  let listenerMap = new Map();
  let restoreListeners = () => {};

  return {
    instrument(target) {
      restoreListeners();
      listenerMap = new Map();
      const originalAdd = target.addEventListener.bind(target);
      const originalRemove = target.removeEventListener.bind(target);

      target.addEventListener = function addTrackedListener(type, handler, options) {
        const handlers = listenerMap.get(type) || new Set();
        handlers.add(handler);
        listenerMap.set(type, handlers);
        return originalAdd(type, handler, options);
      };

      target.removeEventListener = function removeTrackedListener(type, handler, options) {
        const result = originalRemove(type, handler, options);
        const handlers = listenerMap.get(type);
        if (handlers) {
          handlers.delete(handler);
          if (!handlers.size) listenerMap.delete(type);
        }
        return result;
      };

      restoreListeners = () => {
        target.addEventListener = originalAdd;
        target.removeEventListener = originalRemove;
      };
    },
    snapshot() {
      return Array.from(listenerMap.entries())
        .map(([type, handlers]) => ({ type, count: handlers.size }))
        .sort((a, b) => a.type.localeCompare(b.type));
    },
    cleanup() {
      restoreListeners();
      listenerMap = new Map();
    }
  };
}

describe("__ensureClassicBattleBindings idempotency", () => {
  it("does not duplicate DOM bindings or event listeners", async () => {
    document.body.innerHTML = `
      <header class="header battle-header">
        <div id="scoreboard-left">
          <p id="round-message"></p>
          <p id="next-round-timer"></p>
          <p id="round-counter"></p>
        </div>
        <div id="scoreboard-right">
          <p id="score-display"><span>You: 0</span><span>Opponent: 0</span></p>
        </div>
      </header>
      <main>
        <section id="battle-area">
          <div id="player-card"></div>
          <div id="controls">
            <div id="stat-buttons">
              <button data-stat="power">Power</button>
              <button data-stat="speed">Speed</button>
              <button data-stat="technique">Technique</button>
              <button data-stat="kumikata">Kumi-kata</button>
              <button data-stat="newaza">Ne-waza</button>
            </div>
          </div>
          <div id="opponent-card"></div>
        </section>
      </main>`;

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const listenerTracker = createListenerTracker();
    const EVENT_TARGET_KEY = "__classicBattleEventTarget";
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, EVENT_TARGET_KEY);
    let currentTarget = originalDescriptor?.value;
    const assignInstrumentedTarget = (target) => {
      currentTarget = target;
      if (target) {
        listenerTracker.instrument(target);
      } else {
        listenerTracker.cleanup();
      }
    };

    Object.defineProperty(globalThis, EVENT_TARGET_KEY, {
      configurable: true,
      enumerable: false,
      get() {
        return currentTarget;
      },
      set(value) {
        assignInstrumentedTarget(value);
      }
    });

    battleEvents.__resetBattleEventTarget();
    const ensureTargetBound = () => battleEvents.getBattleEventTarget();
    ensureTargetBound();

    try {
      const battle = await import("../../src/helpers/classicBattle.js");
      const buttonSnapshot = () =>
        Array.from(document.querySelectorAll("#stat-buttons button"), (btn) => ({
          stat: btn.dataset.stat,
          text: (btn.textContent || "").trim()
        }));

      const baselineButtons = buttonSnapshot();

      expect(listenerTracker.snapshot()).toEqual([]);
      await expect(battle.__ensureClassicBattleBindings({ force: true })).resolves.not.toThrow();

      const forcedListeners = listenerTracker.snapshot();
      expect(forcedListeners.length).toBeGreaterThan(0);
      expect(buttonSnapshot()).toEqual(baselineButtons);

      await expect(battle.__ensureClassicBattleBindings({ force: true })).resolves.not.toThrow();
      expect(listenerTracker.snapshot()).toEqual(forcedListeners);
      expect(buttonSnapshot()).toEqual(baselineButtons);

      await expect(battle.__ensureClassicBattleBindings()).resolves.not.toThrow();
      expect(listenerTracker.snapshot()).toEqual(forcedListeners);
      expect(buttonSnapshot()).toEqual(baselineButtons);

      await expect(battle.__ensureClassicBattleBindings()).resolves.not.toThrow();
      expect(listenerTracker.snapshot()).toEqual(forcedListeners);
      expect(buttonSnapshot()).toEqual(baselineButtons);
    } finally {
      listenerTracker.cleanup();
      if (originalDescriptor) {
        Object.defineProperty(globalThis, EVENT_TARGET_KEY, originalDescriptor);
      } else {
        delete globalThis[EVENT_TARGET_KEY];
      }
      battleEvents.__resetBattleEventTarget();
    }
  });
});
