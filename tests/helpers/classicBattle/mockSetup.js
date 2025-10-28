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

const mocks = {
  fetchJsonMock: undefined,
  generateRandomCardMock: undefined,
  getRandomJudokaMock: undefined,
  renderMock: undefined,
  JudokaCardMock: undefined,
  currentFlags: {}
};

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => mocks.generateRandomCardMock(...args),
  renderJudokaCard: async (
    judoka,
    gokyoLookup,
    containerEl,
    prefersReducedMotion,
    enableInspector
  ) => {
    // Import here to use the current mocks (like JudokaCard)
    const { JudokaCard } = await import("../../../src/components/JudokaCard.js");

    if (!containerEl) {
      throw new Error("renderJudokaCard: containerEl is required but was not provided.");
    }
    try {
      const card = await new JudokaCard(judoka, gokyoLookup, { enableInspector }).render();
      if (!card || !(card instanceof HTMLElement)) {
        console.error("JudokaCard did not render an HTMLElement");
        containerEl.innerHTML = "";
        return false;
      }

      try {
        containerEl.innerHTML = "";
        containerEl.appendChild(card);
        return true;
      } catch (displayError) {
        console.error("Error displaying card:", displayError);
        containerEl.innerHTML = "";
        return false;
      }
    } catch (error) {
      console.error("Error rendering card:", error);
      containerEl.innerHTML = "";
      return false;
    }
  }
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
