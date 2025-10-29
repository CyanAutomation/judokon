import { isConsoleMocked, shouldShowTestLogs } from "../../../src/helpers/testLogGate.js";
import { vi } from "vitest";
import defaultSettings from "../../../src/data/settings.json" with { type: "json" };

const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] mockSetup.js top-level loaded");

const setupLazyPortraitsMock = vi.fn();
const markSignatureMoveReadyMock = vi.fn();

const mocks = {
  fetchJsonMock: undefined,
  generateRandomCardMock: undefined,
  getRandomJudokaMock: undefined,
  renderMock: undefined,
  JudokaCardMock: undefined,
  setupLazyPortraitsMock,
  markSignatureMoveReadyMock,
  currentFlags: {}
};

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => mocks.generateRandomCardMock(...args)
}));

vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => mocks.getRandomJudokaMock(...args)
}));

vi.mock("../../../src/components/JudokaCard.js", () => {
  mocks.renderMock = vi.fn();
  mocks.JudokaCardMock = vi
    .fn()
    .mockImplementation((judoka, ...ctorArgs) => ({
      render: (...args) => mocks.renderMock(judoka, ...ctorArgs, ...args)
    }));
  return { JudokaCard: mocks.JudokaCardMock };
});

vi.mock("../../../src/helpers/lazyPortrait.js", () => ({
  setupLazyPortraits: setupLazyPortraitsMock
}));

vi.mock("../../../src/helpers/signatureMove.js", () => ({
  markSignatureMoveReady: markSignatureMoveReadyMock
}));

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => mocks.fetchJsonMock(...args),
  importJsonModule: vi.fn().mockResolvedValue(defaultSettings),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({}),
  escapeHTML: (value) => String(value)
}));

vi.mock("../../../src/helpers/featureFlags.js", () => ({
  featureFlagsEmitter: new EventTarget(),
  initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: mocks.currentFlags }),
  isEnabled: (flag) => mocks.currentFlags[flag]?.enabled ?? false
}));

export function applyMockSetup({
  fetchJsonMock,
  generateRandomCardMock,
  getRandomJudokaMock,
  renderMock,
  currentFlags,
  setupLazyPortraitsMock,
  markSignatureMoveReadyMock
} = {}) {
  mocks.fetchJsonMock = fetchJsonMock;
  mocks.generateRandomCardMock = generateRandomCardMock;
  mocks.getRandomJudokaMock = getRandomJudokaMock;
  mocks.renderMock = renderMock;
  mocks.currentFlags = currentFlags ?? {};
  mocks.setupLazyPortraitsMock.mockReset();
  mocks.markSignatureMoveReadyMock.mockReset();
  if (setupLazyPortraitsMock) {
    mocks.setupLazyPortraitsMock.mockImplementation((...args) => setupLazyPortraitsMock(...args));
  }
  if (markSignatureMoveReadyMock) {
    mocks.markSignatureMoveReadyMock.mockImplementation((...args) => markSignatureMoveReadyMock(...args));
  }
  return mocks;
}

export { mocks };
