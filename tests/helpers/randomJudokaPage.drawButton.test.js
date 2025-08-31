import { describe, it, expect, vi } from "vitest";
import { createRandomCardDom } from "../utils/testUtils.js";
import { withMutedConsole } from "../utils/console.js";

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

    vi.doMock("../../src/components/Button.js", async () => {
      return await vi.importActual("../../src/components/Button.js");
    });

    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
    });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const applyMotionPreference = vi.fn();

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/constants.js", async () => ({
      ...(await vi.importActual("../../src/helpers/constants.js")),
      DATA_DIR: ""
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

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

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard: vi.fn() }));
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
