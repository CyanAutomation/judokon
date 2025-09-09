import { vi } from "vitest";

/**
 * Load the Battle CLI page module with common mocks and DOM nodes.
 *
 * @pseudocode
 * 1. Prepare default options and establish DOM skeleton.
 * 2. Stub battle helpers and feature flags with `vi.doMock`.
 * 3. Import the page module after mocks are in place.
 * 4. Return the loaded module for use in tests.
 *
 * @param {Object} [options] - Optional configuration.
 * @param {boolean} [options.verbose=false] - Enable verbose flag.
 * @param {boolean} [options.cliShortcuts=true] - Enable CLI shortcuts flag.
 * @param {number} [options.pointsToWin=5] - Initial target score.
 * @param {boolean} [options.autoSelect=true] - Enable auto-select flag.
 * @param {string} [options.html=""] - Extra HTML to append to the test DOM.
 * @param {string} [options.url] - URL to stub as `location`.
 * @param {Array} [options.stats=[]] - Stat metadata returned by `fetchJson`.
 * @param {Array} [options.battleStats=[]] - Values for `BattleEngine.STATS`.
 * @returns {Promise<import("../../../src/pages/index.js")["battleCLI"]>} Loaded module.
 */
export async function loadBattleCLI(options = {}) {
  const {
    verbose = false,
    cliShortcuts = true,
    pointsToWin = 10,
    autoSelect = true,
    html = "",
    url,
    stats = [],
    battleStats = [],
    mockBattleEvents = true,
    mockBattleEngine = true
  } = options;

  const baseHtml = `
    <div id="cli-root"></div>
    <main id="cli-main"></main>
    <div id="cli-round"></div>
    <div id="cli-stats" tabindex="0"></div>
    <div id="cli-help"></div>
    <select id="points-select">
      <option value="5">5</option>
      <option value="10">10</option>
      <option value="15">15</option>
    </select>
    <section id="cli-verbose-section" hidden>
      <pre id="cli-verbose-log"></pre>
    </section>
    <input id="verbose-toggle" type="checkbox" />
    <div id="cli-shortcuts" hidden><button id="cli-shortcuts-close"></button><div id="cli-shortcuts-body"></div></div>
    <span id="battle-state-badge"></span>
    <div id="round-message"></div>
    <div id="cli-countdown"></div>
    <div id="cli-score" data-score-player="0" data-score-opponent="0"></div>
    <div id="snackbar-container"></div>
    <div id="cli-controls-hint" aria-hidden="true"></div>
  `;
  document.body.innerHTML = baseHtml + html;
  window.__TEST__ = true;
  if (url) {
    vi.stubGlobal("location", new URL(url));
  }

  const emitter = new EventTarget();
  vi.doMock("../../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn().mockResolvedValue({
      featureFlags: {
        cliVerbose: { enabled: verbose },
        cliShortcuts: { enabled: cliShortcuts },
        autoSelect: { enabled: autoSelect }
      }
    }),
    isEnabled: vi.fn((flag) => {
      switch (flag) {
        case "cliVerbose":
          return verbose;
        case "cliShortcuts":
          return cliShortcuts;
        case "autoSelect":
          return autoSelect;
        default:
          return false;
      }
    }),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn(),
    resetGame: vi.fn()
  }));
  vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  if (mockBattleEvents) {
    // Provide a functional in-memory event bus for battle events so the page
    // can react to emitted events in tests (focus, countdown, etc.).
    const battleBus = new EventTarget();
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => {
      const onBattleEvent = vi.fn((type, handler) => {
        try {
          battleBus.addEventListener(type, handler);
        } catch {}
      });
      const offBattleEvent = vi.fn((type, handler) => {
        try {
          battleBus.removeEventListener(type, handler);
        } catch {}
      });
      const emitBattleEvent = vi.fn((type, detail) => {
        try {
          battleBus.dispatchEvent(new CustomEvent(type, { detail }));
        } catch {}
      });
      const getBattleEventTarget = vi.fn(() => battleBus);
      const __resetBattleEventTarget = vi.fn(() => {
        // Replace the bus with a fresh one so subsequent tests don't share listeners

        while (true) {
          // EventTarget does not expose listeners; callers will rebind on next import
          break;
        }
      });
      return {
        onBattleEvent,
        offBattleEvent,
        emitBattleEvent,
        getBattleEventTarget,
        __resetBattleEventTarget
      };
    });
  }

  vi.doMock("../../../src/helpers/BattleEngine.js", () => ({ STATS: battleStats }));
  let pts = pointsToWin;
  if (mockBattleEngine) {
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      setPointsToWin: vi.fn((v) => {
        pts = v;
      }),
      getPointsToWin: vi.fn(() => pts),
      getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 })),
      stopTimer: vi.fn()
    }));
  }
  vi.doMock("../../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue(stats)
  }));
  vi.doMock("../../../src/helpers/constants.js", () => ({
    DATA_DIR: "",
    // Provide defaults used by the CLI UI
    SNACKBAR_REMOVE_MS: 3000,
    SNACKBAR_FADE_MS: 2500
  }));
  vi.doMock("../../../src/helpers/classicBattle/autoSelectStat.js", () => ({
    autoSelectStat: vi.fn()
  }));
  vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
    skipRoundCooldownIfEnabled: vi.fn(),
    updateBattleStateBadge: vi.fn()
  }));
  vi.doMock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
    initRoundSelectModal: vi.fn().mockRejectedValue(new Error("Modal init failed"))
  }));
  {
    let __autoContinue = true;
    vi.doMock("../../../src/helpers/classicBattle/orchestratorHandlers.js", () => ({
      setAutoContinue: vi.fn((v) => {
        __autoContinue = v !== false;
      }),
      get autoContinue() {
        return __autoContinue;
      }
    }));
  }

  const mod = await import("../../../src/pages/index.js");
  return mod.battleCLI;
}

/**
 * Clean up DOM and mocks after a Battle CLI test.
 *
 * @pseudocode
 * 1. Clear DOM and globals.
 * 2. Remove mocks and restore vitest state.
 * 3. Invoke battle test hooks to reset modules.
 *
 * @returns {Promise<void>} resolves when cleanup completes.
 */
export async function cleanupBattleCLI() {
  document.body.innerHTML = "";
  delete window.__TEST__;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  const mocked = [
    "../../../src/helpers/featureFlags.js",
    "../../../src/helpers/classicBattle/roundManager.js",
    "../../../src/helpers/classicBattle/orchestrator.js",
    "../../../src/helpers/classicBattle/battleEvents.js",

    "../../../src/helpers/BattleEngine.js",
    "../../../src/helpers/battleEngineFacade.js",
    "../../../src/helpers/dataUtils.js",
    "../../../src/helpers/constants.js",
    "../../../src/helpers/classicBattle/autoSelectStat.js",
    "../../../src/helpers/classicBattle/uiHelpers.js",
    "../../../src/helpers/classicBattle/orchestratorHandlers.js",
    "../../../src/helpers/classicBattle/roundSelectModal.js"
  ];
  mocked.forEach((m) => vi.doUnmock(m));
  try {
    const { __resetClassicBattleBindings } = await import("../../../src/helpers/classicBattle.js");
    __resetClassicBattleBindings();
  } catch {}
  try {
    const { __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    __resetBattleEventTarget();
  } catch {}
}
