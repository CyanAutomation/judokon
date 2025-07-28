import { describe, it, expect, vi } from "vitest";
import { createRandomCardDom, getJudokaFixture } from "../utils/testUtils.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCssVariables } from "../../src/helpers/cssVariableParser.js";
import { hex } from "wcag-contrast";

const baseSettings = {
  sound: false,
  motionEffects: true,
  typewriterEffect: true,
  displayMode: "light",
  gameModes: {},
  featureFlags: {
    randomStatMode: false,
    battleDebugPanel: false,
    fullNavigationMap: true,
    enableTestMode: false,
    enableCardInspector: false,
    enableLowConfidenceResults: false
  }
};

describe("randomJudokaPage module", () => {
  it("initializes controls and passes motion flag", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);
    const createButton = vi.fn((_, opts = {}) => {
      const btn = document.createElement("button");
      if (opts.id) btn.id = opts.id;
      return btn;
    });
    const createToggleSwitch = vi.fn((_, opts) => {
      const wrapper = document.createElement("div");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = opts.id;
      input.checked = opts.checked;
      wrapper.appendChild(input);
      return wrapper;
    });
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const applyMotionPreference = vi.fn();

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
    vi.doMock("../../src/components/Button.js", () => ({ createButton }));
    vi.doMock("../../src/components/ToggleSwitch.js", () => ({ createToggleSwitch }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings, updateSetting }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container } = createRandomCardDom();
    document.body.append(section, container);

    const { setupRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(loadSettings).toHaveBeenCalled();
    expect(createToggleSwitch).toHaveBeenCalledTimes(2);
    expect(applyMotionPreference).toHaveBeenCalledWith(baseSettings.motionEffects);
    expect(generateRandomCard.mock.calls[0][3]).toBe(false);
    expect(typeof setupRandomJudokaPage).toBe("function");
    expect(document.getElementById("draw-card-btn").dataset.tooltipId).toBe("ui.drawCard");
  });

  it("renders card text with sufficient color contrast", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const judoka = getJudokaFixture()[0];

    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn();
    const applyMotionPreference = vi.fn();

    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: () => document.createElement("button")
    }));
    vi.doMock("../../src/components/ToggleSwitch.js", () => ({
      createToggleSwitch: () => document.createElement("div")
    }));
    vi.doMock("../../src/helpers/randomCard.js", async () => {
      const { generateJudokaCardHTML } = await import("../../src/helpers/cardBuilder.js");
      return {
        generateRandomCard: async (_cards, _gokyo, container) => {
          const card = await generateJudokaCardHTML(judoka, {});
          container.appendChild(card);
        }
      };
    });
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

    const { section, container } = createRandomCardDom();
    document.body.append(section, container);

    const vars = parseCssVariables(readFileSync(resolve("src/styles/base.css"), "utf8"));
    const cardCss = readFileSync(resolve("src/styles/card.css"), "utf8");
    const match = cardCss.match(/\.judoka-card\.common\s*{[^}]*--card-bg-color:\s*([^;]+);/);
    const cardBg = match ? match[1].trim() : "#000";

    document.documentElement.style.setProperty(
      "--color-text-inverted",
      vars["--color-text-inverted"]
    );

    await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const cardEl = container.querySelector(".judoka-card");
    cardEl.style.setProperty("--card-bg-color", cardBg);

    const bg = getComputedStyle(cardEl).getPropertyValue("--card-bg-color").trim();
    const text = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-text-inverted")
      .trim();
    const ratio = hex(bg, text);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("draw button meets minimum size requirements", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    vi.doMock("../../src/components/Button.js", async () => {
      return await vi.importActual("../../src/components/Button.js");
    });
    vi.doMock("../../src/components/ToggleSwitch.js", async () => {
      return await vi.importActual("../../src/components/ToggleSwitch.js");
    });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn();
    const applyMotionPreference = vi.fn();

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container } = createRandomCardDom();
    document.body.append(section, container);

    const navbarCss = readFileSync(resolve("src/styles/navbar.css"), "utf8");
    const style = document.createElement("style");
    style.textContent = navbarCss;
    document.head.appendChild(style);

    await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const button = document.getElementById("draw-card-btn");
    const computed = getComputedStyle(button);
    expect(parseInt(computed.minHeight)).toBeGreaterThanOrEqual(64);
    expect(parseInt(computed.width)).toBeGreaterThanOrEqual(300);
  });

  it("storage event toggles card inspector", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      card.dataset.cardJson = JSON.stringify({ id: 1 });
      const inner = document.createElement("div");
      inner.className = "judoka-card";
      inner.innerHTML =
        '<div class="card-top-bar"></div><div class="card-portrait"></div><div class="card-stats"></div><div class="signature-move-container" data-tooltip-id="ui.signatureBar"></div>';
      card.appendChild(inner);
      container.appendChild(card);
    });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn();
    const applyMotionPreference = vi.fn();

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container } = createRandomCardDom();
    document.body.append(section, container);

    await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(container.querySelector(".debug-panel")).toBeNull();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "settings",
        newValue: JSON.stringify({
          ...baseSettings,
          featureFlags: { ...baseSettings.featureFlags, enableCardInspector: true }
        })
      })
    );
    expect(container.querySelector(".debug-panel")).toBeTruthy();
  });
});
