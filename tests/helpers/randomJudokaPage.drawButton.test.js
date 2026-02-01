import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSimpleHarness } from "./integrationHarness.js";
import { createRandomCardDom } from "../utils/testUtils.js";
import { withMutedConsole } from "../utils/console.js";

const harness = createSimpleHarness();

// ===== Top-level vi.hoisted() for shared mock state =====
const { mocks } = vi.hoisted(() => {
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

  const mockState = {
    generateRandomCard: vi.fn().mockResolvedValue({ name: "Test Judoka" }),
    fetchJson: vi.fn().mockResolvedValue([]),
    loadSettings: vi.fn().mockResolvedValue(baseSettings),
    loadGokyoLookup: vi.fn().mockResolvedValue({}),
    renderJudokaCard: vi.fn().mockResolvedValue(),
    preloadRandomCardData: vi
      .fn()
      .mockResolvedValue({ judokaData: [], gokyoData: [], error: null }),
    applyMotionPreference: vi.fn(),
    shouldReduceMotionSync: vi.fn().mockReturnValue(false),
    readyCallbacks: [],
    baseSettings
  };

  return { mocks: mockState };
});

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/randomCard.js", () => ({
  generateRandomCard: mocks.generateRandomCard,
  loadGokyoLookup: mocks.loadGokyoLookup,
  renderJudokaCard: mocks.renderJudokaCard,
  preloadRandomCardData: mocks.preloadRandomCardData,
  createHistoryManager: vi.fn(() => ({
    add: vi.fn(),
    get: vi.fn().mockReturnValue([])
  }))
}));

vi.mock("../../src/helpers/dataUtils.js", async () => ({
  ...(await vi.importActual("../../src/helpers/dataUtils.js")),
  fetchJson: mocks.fetchJson
}));

vi.mock("../../src/helpers/settingsStorage.js", () => ({
  loadSettings: mocks.loadSettings
}));

vi.mock("../../src/helpers/motionUtils.js", () => ({
  applyMotionPreference: mocks.applyMotionPreference,
  shouldReduceMotionSync: mocks.shouldReduceMotionSync
}));

vi.mock("../../src/helpers/domReady.js", () => ({
  onDomReady: (fn) => {
    mocks.readyCallbacks.push(fn);
  }
}));

vi.mock("../../src/helpers/constants.js", async () => ({
  ...(await vi.importActual("../../src/helpers/constants.js")),
  DATA_DIR: ""
}));

beforeEach(async () => {
  await harness.setup();
});

describe("randomJudokaPage draw button", () => {
  it("updates loading state on draw button while drawing", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
    });

    // Update module-level mock for this test
    mocks.generateRandomCard.mockImplementation(generateRandomCard);

    const { section, container } = createRandomCardDom();
    document.body.append(section);
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

    // Update module-level mock for this test
    mocks.generateRandomCard.mockImplementation(generateRandomCard);

    const { section } = createRandomCardDom();
    document.body.append(section);
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

  it("shows fallback and transitions to IDLE when card markup is missing", async () => {
    await withMutedConsole(async () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });

      const generateRandomCard = vi.fn().mockResolvedValue({ name: "Ghost Judoka" });
      // Update module-level mock for this test
      mocks.generateRandomCard.mockImplementation(generateRandomCard);

      // Mock renderJudokaCard to actually create the fallback card element
      mocks.renderJudokaCard.mockImplementation(async (judoka, gokyo, container) => {
        const card = document.createElement("div");
        card.className = "card-container";
        card.textContent = `Fallback: ${judoka.name}`;
        container.appendChild(card);
      });

      const { section, container } = createRandomCardDom();
      document.body.append(section);

      const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
      await initRandomJudokaPage();

      const button = document.getElementById("draw-card-btn");
      const label = button.querySelector(".button-label");
      button.fallbackDelayMs = 0;

      button.click();

      await button.drawPromise;
      await harness.timerControl.runAllTimersAsync();

      // Missing card markup is now treated as an error, so fallback is rendered
      // and button transitions to IDLE after error handling
      expect(button.disabled).toBe(false);
      expect(button).not.toHaveAttribute("aria-disabled");
      expect(button.classList.contains("is-loading")).toBe(false);
      expect(label.textContent).toBe("Draw Card!");

      // Verify fallback card was rendered
      const fallbackCard = container.querySelector(".card-container");
      expect(fallbackCard).toBeTruthy();
    });
  });

  it("disables draw button when data load fails", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    // Update module-level mocks for this test
    mocks.preloadRandomCardData.mockRejectedValue(new Error("fail"));

    const { section } = createRandomCardDom();
    document.body.append(section);

    await withMutedConsole(async () => {
      const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
      await initRandomJudokaPage();
    });

    const button = document.getElementById("draw-card-btn");
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const errorEl = document.getElementById("draw-error-message");
    expect(errorEl?.textContent).toMatch(/Unable to load judoka data/);
  });

  it("disables draw button when preload resolves to invalid value", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    // preload resolves to a non-object value
    mocks.preloadRandomCardData.mockResolvedValue("invalid");

    const { section } = createRandomCardDom();
    document.body.append(section);

    await withMutedConsole(async () => {
      const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
      await initRandomJudokaPage();
    });

    const button = document.getElementById("draw-card-btn");
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const errorEl = document.getElementById("draw-error-message");
    expect(errorEl?.textContent).toMatch(/Unable to load judoka data/);
  });

  it("does not duplicate controls when initialized twice", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    // Reset readyCallbacks for this test
    mocks.readyCallbacks.length = 0;

    const { section } = createRandomCardDom();
    document.body.append(section);

    const { initRandomJudokaPage, randomJudokaReadyPromise } = await import(
      "../../src/helpers/randomJudokaPage.js"
    );

    await initRandomJudokaPage();
    expect(mocks.readyCallbacks).toHaveLength(1);

    await initRandomJudokaPage();
    expect(mocks.readyCallbacks).toHaveLength(1);

    mocks.readyCallbacks.forEach((fn) => fn());

    await randomJudokaReadyPromise;

    expect(document.querySelectorAll("#draw-card-btn")).toHaveLength(1);
    expect(document.querySelectorAll("#toggle-history-btn")).toHaveLength(1);
    expect(document.querySelectorAll("#history-panel")).toHaveLength(1);
    expect(document.body?.getAttribute("data-random-judoka-ready")).toBe("true");
  });
});
