import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRandomJudokaPageHarness } from "./integrationHarness.js";
import { createRandomCardDom } from "../utils/testUtils.js";
import { withMutedConsole } from "../utils/console.js";

const harness = createRandomJudokaPageHarness();

beforeEach(async () => {
  await harness.setup();
});

const baseSettings = {
  motionEffects: true,
  typewriterEffect: true,
  tooltips: true,
  displayMode: "light",
  fullNavigationMap: true,
  gameModes: {},
  featureFlags: {
    enableTestMode: { enabled: false },
    enableCardInspector: { enabled: false }
  }
};

function setupRandomJudokaCoreMocks(overrides = {}) {
  const mocks = {
    generateRandomCard: vi.fn().mockResolvedValue({ name: "Test Judoka" }),
    fetchJson: vi.fn().mockResolvedValue([]),
    loadSettings: vi.fn().mockResolvedValue(baseSettings),
    loadGokyoLookup: vi.fn().mockResolvedValue({}),
    renderJudokaCard: vi.fn().mockResolvedValue(),
    applyMotionPreference: vi.fn(),
    shouldReduceMotionSync: vi.fn().mockReturnValue(false),
    ...overrides
  };

  vi.doMock("../../src/helpers/randomCard.js", () => ({
    generateRandomCard: mocks.generateRandomCard,
    loadGokyoLookup: mocks.loadGokyoLookup,
    renderJudokaCard: mocks.renderJudokaCard
  }));
  vi.doMock("../../src/helpers/dataUtils.js", async () => ({
    ...(await vi.importActual("../../src/helpers/dataUtils.js")),
    fetchJson: mocks.fetchJson
  }));
  vi.doMock("../../src/helpers/settingsStorage.js", () => ({
    loadSettings: mocks.loadSettings
  }));
  vi.doMock("../../src/helpers/motionUtils.js", () => ({
    applyMotionPreference: mocks.applyMotionPreference,
    shouldReduceMotionSync: mocks.shouldReduceMotionSync
  }));

  return mocks;
}

describe("randomJudokaPage draw button", () => {
  it("updates loading state on draw button while drawing", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
    });

    setupRandomJudokaCoreMocks({ generateRandomCard });

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);
    document.body?.removeAttribute("data-random-judoka-ready");

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const button = document.getElementById("draw-card-btn");
    const label = button.querySelector(".button-label");

    button.fallbackDelayMs = 0;
    button.timers = { setTimeout: () => 0, clearTimeout: () => {} };
    button.click();
    await Promise.resolve();
    const card = container.querySelector(".card-container");
    expect(label.textContent).toBe("Drawing…");
    expect(button.getAttribute("aria-busy")).toBe("true");
    card.dispatchEvent(new Event("animationend"));
    await button.drawPromise;
    expect(label.textContent).toBe("Draw Card!");
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("retains a custom draw button label across multiple draws", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
    });

    setupRandomJudokaCoreMocks({ generateRandomCard });

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);
    document.body?.removeAttribute("data-random-judoka-ready");

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const button = document.getElementById("draw-card-btn");
    const label = () => button.querySelector(".button-label")?.textContent;

    button.fallbackDelayMs = 0;
    button.timers = { setTimeout: () => 0, clearTimeout: () => {} };

    const { randomJudoka } = window.__TEST_API;
    randomJudoka.setDrawButtonLabel("Custom Label");

    expect(label()).toBe("Custom Label");

    button.click();
    await randomJudoka.resolveDrawPipeline();
    expect(label()).toBe("Custom Label");

    button.click();
    await randomJudoka.resolveDrawPipeline();
    expect(label()).toBe("Custom Label");
  });

  it("re-enables draw button immediately when card markup is missing", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn();

    try {
      const generateRandomCard = vi.fn().mockResolvedValue({ name: "Ghost Judoka" });
      setupRandomJudokaCoreMocks({ generateRandomCard });

      const { section, container, placeholderTemplate } = createRandomCardDom();
      document.body.append(section, container, placeholderTemplate);

      const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
      await initRandomJudokaPage();

      const button = document.getElementById("draw-card-btn");
      const label = button.querySelector(".button-label");

      button.click();

      await button.drawPromise;

      expect(button.disabled).toBe(false);
      expect(button).not.toHaveAttribute("aria-disabled");
      expect(button.classList.contains("is-loading")).toBe(false);
      expect(label.textContent).toBe("Draw Card!");
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it("disables draw button when data load fails", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const dataUtils = await import("../../src/helpers/dataUtils.js");
    const fetchSpy = vi.spyOn(dataUtils, "fetchJson").mockRejectedValue(new Error("fail"));
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const applyMotionPreference = vi.fn();
    const createButton = vi.fn((_, opts = {}) => {
      const btn = document.createElement("button");
      if (opts.id) btn.id = opts.id;
      return btn;
    });

    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard: vi.fn(),
      loadGokyoLookup,
      renderJudokaCard
    }));
    vi.doMock("../../src/components/Button.js", () => ({ createButton }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));
    vi.doMock("../../src/helpers/constants.js", async () => ({
      ...(await vi.importActual("../../src/helpers/constants.js")),
      DATA_DIR: ""
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    await withMutedConsole(async () => {
      const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
      await initRandomJudokaPage();
    });

    const button = document.getElementById("draw-card-btn");
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const errorEl = document.getElementById("draw-error-message");
    expect(errorEl?.textContent).toMatch(/Unable to load judoka data/);
    fetchSpy.mockRestore();
  });

  it("does not duplicate controls when initialized twice", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const readyCallbacks = [];
    vi.doMock("../../src/helpers/domReady.js", () => ({
      onDomReady: (fn) => {
        readyCallbacks.push(fn);
      }
    }));

    setupRandomJudokaCoreMocks();

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage, randomJudokaReadyPromise } = await import(
      "../../src/helpers/randomJudokaPage.js"
    );

    await initRandomJudokaPage();
    expect(readyCallbacks).toHaveLength(1);

    await initRandomJudokaPage();
    expect(readyCallbacks).toHaveLength(1);

    readyCallbacks.forEach((fn) => fn());

    await randomJudokaReadyPromise;

    expect(document.querySelectorAll("#draw-card-btn")).toHaveLength(1);
    expect(document.querySelectorAll("#toggle-history-btn")).toHaveLength(1);
    expect(document.querySelectorAll("#history-panel")).toHaveLength(1);
    expect(document.body?.getAttribute("data-random-judoka-ready")).toBe("true");
  });
});
