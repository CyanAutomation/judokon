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

describe("randomJudokaPage draw button", () => {
  it("updates loading state on draw button while drawing", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
    });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);

    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

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

  it("announces the drawn card using first and last name", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const judoka = {
      firstname: "Kaori",
      surname: "Matsumoto",
      name: "Should Not Use"
    };
    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
      return judoka;
    });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);

    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    const announcer = document.createElement("div");
    announcer.id = "card-announcer";
    document.body.append(section, container, placeholderTemplate, announcer);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const button = document.getElementById("draw-card-btn");
    button.fallbackDelayMs = 0;
    button.timers = { setTimeout: () => 0, clearTimeout: () => {} };

    button.click();
    await Promise.resolve();
    container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));
    await button.drawPromise;

    expect(announcer.textContent).toBe("New card drawn: Kaori Matsumoto");
  });

  it("announces the drawn card when firstname is missing", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const judoka = {
      firstname: null,
      surname: "Inoue",
      name: "Legacy Should Not Use"
    };
    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
      return judoka;
    });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);

    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    const announcer = document.createElement("div");
    announcer.id = "card-announcer";
    document.body.append(section, container, placeholderTemplate, announcer);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const button = document.getElementById("draw-card-btn");
    button.fallbackDelayMs = 0;
    button.timers = { setTimeout: () => 0, clearTimeout: () => {} };

    button.click();
    await Promise.resolve();
    container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));
    await button.drawPromise;

    expect(announcer.textContent).toBe("New card drawn: Inoue");
  });

  it("falls back to legacy name when structured fields are absent", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const judoka = {
      name: "Legacy Name Format"
    };
    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
      return judoka;
    });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);

    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    const announcer = document.createElement("div");
    announcer.id = "card-announcer";
    document.body.append(section, container, placeholderTemplate, announcer);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const button = document.getElementById("draw-card-btn");
    button.fallbackDelayMs = 0;
    button.timers = { setTimeout: () => 0, clearTimeout: () => {} };

    button.click();
    await Promise.resolve();
    container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));
    await button.drawPromise;

    expect(announcer.textContent).toBe("New card drawn: Legacy Name Format");
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
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));
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
});
