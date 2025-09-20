const shouldShowTestLogs = () => typeof process !== "undefined" && process.env?.SHOW_TEST_LOGS;
const isConsoleMocked = (method) => {
  const viInstance = globalThis?.vi;
  return (
    typeof viInstance?.isMockFunction === "function" &&
    typeof method === "function" &&
    viInstance.isMockFunction(method)
  );
};
const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] mockSetup.js top-level loaded");
// [TEST DEBUG] top-level mockSetup.js

debugLog("[TEST DEBUG] top-level mockSetup.js");
import { vi } from "vitest";
import defaultSettings from "../../../src/data/settings.json" with { type: "json" };

const mocks = {
  fetchJsonMock: undefined,
  generateRandomCardMock: undefined,
  getRandomJudokaMock: undefined,
  renderMock: undefined,
  JudokaCardMock: undefined,
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
  mocks.JudokaCardMock = vi.fn().mockImplementation(() => ({ render: mocks.renderMock }));
  return { JudokaCard: mocks.JudokaCardMock };
});

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => mocks.fetchJsonMock(...args),
  importJsonModule: vi.fn().mockResolvedValue(defaultSettings),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
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
  currentFlags
} = {}) {
  mocks.fetchJsonMock = fetchJsonMock;
  mocks.generateRandomCardMock = generateRandomCardMock;
  mocks.getRandomJudokaMock = getRandomJudokaMock;
  mocks.renderMock = renderMock;
  mocks.currentFlags = currentFlags ?? {};
  return mocks;
}

export { mocks };
