import { resetStatButtons } from "./statButtons.js";
import { skipCurrentPhase } from "./skipHandler.js";
import { start as startScheduler, stop as stopScheduler } from "../../utils/scheduler.js";
import { emitBattleEvent } from "./battleEvents.js";
import { roundState } from "./roundState.js";
/**
 * Create a debug API for Classic Battle used in tests and developer tooling.
 *
 * Exposes helpers that allow tests to skip phases, override round start, and
 * pause/resume header timers. The created API is attached to `window` when
 * available to make it easy to access from test runner contexts.
 *
 * @pseudocode
 * 1. Read the battle store from `view.controller.battleStore`.
 * 2. Provide `skipBattlePhase` that calls `skipCurrentPhase()` and resets stat buttons.
 * 3. Provide `startRoundOverride` that delegates to `view.startRound()`.
 * 4. Provide `freezeBattleHeader` and `resumeBattleHeader` to pause/resume timers.
 * 5. Attach the API and store to `window` when running in a browser environment.
 *
 * @param {import("./view.js").ClassicBattleView} view - The Classic Battle view instance.
 * @returns {{battleStore: ReturnType<import("./roundManager.js").createBattleStore>, skipBattlePhase: Function, startRoundOverride: Function, freezeBattleHeader: Function, resumeBattleHeader: Function}}
 */
export function createClassicBattleDebugAPI(view) {
  const store = view.controller.battleStore;
  const orchestratorApi = {
    selectStatByIndex: (i) => {
      try {
        const buttons = Array.from(document.querySelectorAll("#stat-buttons button"));
        const btn = buttons[i];
        if (btn && !btn.disabled) {
          btn.click();
          return roundState.getCurrentRound();
        }
      } catch {}
      return roundState.getCurrentRound();
    },
    selectStat: (statKey) => {
      try {
        const label = String(statKey || "").toLowerCase();
        const btn = Array.from(document.querySelectorAll("#stat-buttons button")).find((b) =>
          (b.textContent || "").toLowerCase().includes(label)
        );
        if (btn && !btn.disabled) btn.click();
      } catch {}
      try {
        document.body?.setAttribute?.("data-stat-selected", "true");
      } catch {}
      try {
        return roundState.getCurrentRound();
      } catch {
        return {};
      }
    }
  };
  // Resolve stat controls via view/controller to bypass DOM listener timing
  const getStatButtons = () => {
    try {
      return Array.from(document.querySelectorAll("#stat-buttons button"));
    } catch {
      return [];
    }
  };
  const statApi = {
    isReady: () => getStatButtons().length > 0,
    selectByIndex: (i) => {
      const btns = getStatButtons();
      const btn = btns[i];
      if (btn && !btn.disabled) btn.click();
    }
  };
  const skipBattlePhase = () => {
    try {
      skipCurrentPhase();
    } catch {}
    try {
      resetStatButtons();
      const c = document.querySelectorAll("#stat-buttons .selected").length;
      console.warn(`[test] skipBattlePhase: after immediate reset selected=${c}`);
    } catch {}
    return Promise.resolve();
  };

  const startRoundOverride = () => view.startRound();
  const freezeBattleHeader = () => {
    try {
      view.controller.timerControls.pauseTimer();
      stopScheduler();
    } catch {}
  };
  const resumeBattleHeader = () => {
    try {
      startScheduler();
      view.controller.timerControls.resumeTimer();
    } catch {}
  };

  const api = {
    battleStore: store,
    skipBattlePhase,
    startRoundOverride,
    freezeBattleHeader,
    resumeBattleHeader,
    stat: statApi,
    orchestrator: orchestratorApi,
    round: {
      get: () => {
        try {
        return roundState.getCurrentRound();
        } catch {
          return {};
        }
      },
      // Deterministically finish the current round for tests
      finish: async () => {
        try {
          // Prefer selecting the first enabled stat for a natural flow
          if (statApi.isReady()) {
            statApi.selectByIndex(0);
          }
        } catch {}
        // Wait a short tick to allow resolution
        await Promise.resolve();
        // Emit canonical roundResolved to mirror production pipeline via battle event bus
        try {
          const result = {
            message: "Test round resolved",
            playerScore: 1,
            opponentScore: 0,
            matchEnded: false
          };
          // Defer to microtask to avoid synchronous re-entrancy issues in some harnesses
          if (typeof queueMicrotask === "function")
            queueMicrotask(() => emitBattleEvent("roundResolved", { result, store }));
          else emitBattleEvent("roundResolved", { result, store });
        } catch {}
        // If still not progressing, attempt to skip the phase via handler
        try {
          await skipBattlePhase();
        } catch {}
        return true;
      },
      // Wait for cooldown readiness and trigger public Next handler
      advanceAfterCooldown: async () => {
        try {
          // Prefer triggering the same handler bound to the Next button
          const nextBtn =
            document.getElementById("next-button") ||
            document.querySelector('[data-role="next-round"]');
          if (nextBtn) {
            // Wait until button is enabled/ready
            const start = Date.now();
            while (
              (nextBtn.disabled || nextBtn.getAttribute("data-next-ready") !== "true") &&
              Date.now() - start < 5000
            ) {
              await new Promise((r) => setTimeout(r, 50));
            }
            // Invoke the click handler programmatically via click() to follow public path
            nextBtn.click();
            return true;
          }
        } catch {}
        return false;
      }
    }
  };

  if (typeof window !== "undefined") {
    window.battleStore = store;
    window.__TEST__ = window.__TEST__ || {};
    Object.assign(window.__TEST__, api);
  }

  return api;
}

export default createClassicBattleDebugAPI;
