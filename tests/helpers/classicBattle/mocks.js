import { vi } from "vitest";
import classicBattleStates from "../../../src/data/classicBattleStates.json" with { type: "json" };
import defaultSettings from "../../../src/data/settings.json" with { type: "json" };

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
    if (path.includes("classicBattleStates.json")) return classicBattleStates;
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
  vi.doMock("../../../src/helpers/classicBattlePage.js", async () => {
    const actual = await vi.importActual("../../../src/helpers/classicBattlePage.js");
    return { ...actual, selectStat: vi.fn() };
  });
}

export function mockBattleJudokaPage() {
  vi.doMock("../../../src/helpers/battleJudokaPage.js", () => ({
    waitForOpponentCard: vi.fn()
  }));
}

export function mockShowSnackbar() {
  vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
    showSnackbar: vi.fn()
  }));
}

export function mockTooltips() {
  vi.doMock("../../../src/helpers/tooltip.js", () => ({
    initTooltips: vi.fn().mockResolvedValue(() => {})
  }));
}

export function mockTestModeUtils() {
  vi.doMock("../../../src/helpers/testModeUtils.js", () => ({
    setTestMode: vi.fn()
  }));
}

export function mockRoundSelectModal() {
  vi.doMock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
    initRoundSelectModal: vi.fn()
  }));
}
