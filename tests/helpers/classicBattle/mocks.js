import { vi } from "vitest";
// Inline minimal default settings used by tests to avoid parser issues with
// `import ... assert { type: 'json' }` in some ESLint parser configs.
const defaultSettings = {};

export function mockScheduler() {
  vi.mock("../../../src/utils/scheduler.js", () => ({
    start: vi.fn(),
    stop: vi.fn(),
    onFrame: vi.fn(),
    cancel: vi.fn(),
    onSecondTick: vi.fn()
  }));
}

export function mockFeatureFlags(initialFlags = {}) {
  const defaultFlags = {
    battleStateBadge: { enabled: true },
    ...initialFlags
  };

  vi.doMock("../../../src/helpers/featureFlags.js", () => ({
    featureFlagsEmitter: new EventTarget(),
    isEnabled: (flag) => defaultFlags[flag]?.enabled ?? false,
    initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: defaultFlags })
  }));
}

export function mockDataUtils(fetchImplementation) {
  const defaultFetch = async (path) => {
    if (path.includes("battleRounds.json")) return [];
    return {};
  };

  vi.doMock("../../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn(fetchImplementation || defaultFetch),
    importJsonModule: vi.fn(async () => defaultSettings)
  }));
}

export function mockStats() {
  vi.doMock("../../../src/helpers/stats.js", () => ({
    loadStatNames: async () => [{ name: "Power" }]
  }));
}

export function mockRoundManager() {
  const store = {};
  vi.doMock("../../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: () => store,
    startRound: vi.fn(),
    resetGame: vi.fn(),
    // Legacy export kept for modules that import directly
    _resetForTest: vi.fn()
  }));
}

export function mockSelectionHandler() {
  vi.doMock("../../../src/helpers/classicBattle/selectionHandler.js", () => ({
    handleStatSelection: vi.fn()
  }));
}

export function mockBattleJudokaPage() {
  vi.doMock("../../../src/helpers/battleJudokaPage.js", () => ({
    waitForOpponentCard: vi.fn()
  }));
}

export function mockShowSnackbar() {
  vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
    showSnackbar: vi.fn(),
    updateSnackbar: vi.fn()
  }));
}

export function mockTooltips() {
  vi.mock("../../../src/helpers/tooltip.js", () => ({
    __esModule: true,
    initTooltips: vi.fn().mockResolvedValue(() => {})
  }));
}

export function mockTestModeUtils() {
  vi.doMock("../../../src/helpers/testModeUtils.js", () => ({
    setTestMode: vi.fn(),
    isTestModeEnabled: () => true
  }));
}

export function mockRoundSelectModal() {
  vi.doMock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
    initRoundSelectModal: vi.fn(async (onStart) => {
      if (typeof onStart === "function") await onStart();
    })
  }));
}
