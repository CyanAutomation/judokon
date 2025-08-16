import { describe, it, expect, vi } from "vitest";
import { createRandomCardDom, getJudokaFixture } from "../utils/testUtils.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCssVariables } from "../../src/helpers/cssVariableParser.js";
import { hex } from "wcag-contrast";
import { withMutedConsole } from "../utils/console.js";

const baseSettings = {
  motionEffects: true,
  typewriterEffect: true,
  tooltips: true,
  displayMode: "light",
  fullNavigationMap: true,
  gameModes: {},
  featureFlags: {
    randomStatMode: { enabled: false },
    battleDebugPanel: { enabled: false },
    enableTestMode: { enabled: false },
    enableCardInspector: { enabled: false }
  }
};

describe("randomJudokaPage module", () => {
  it("falls back to defaults when matchMedia is unavailable", async () => {
    const originalMatchMedia = window.matchMedia;
    // Ensure matchMedia is unavailable
    delete window.matchMedia;

    const initFeatureFlags = vi.fn().mockResolvedValue({
      motionEffects: true,
      featureFlags: {
        viewportSimulation: { enabled: false },
        enableCardInspector: { enabled: false },
        tooltipOverlayDebug: { enabled: false }
      }
    });
    const applyMotionPreference = vi.fn();
    const toggleViewportSimulation = vi.fn();
    const toggleInspectorPanels = vi.fn();
    const toggleTooltipOverlayDebug = vi.fn();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags,
      isEnabled: vi.fn().mockReturnValue(false),
      featureFlagsEmitter: new EventTarget()
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels }));
    vi.doMock("../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation }));
    vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({ toggleTooltipOverlayDebug }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));

    const { initFeatureFlagState } = await import("../../src/helpers/randomJudokaPage.js");
    const state = await initFeatureFlagState();
    expect(state.prefersReducedMotion).toBe(false);
    expect(applyMotionPreference).toHaveBeenCalledWith(true);

    // restore
    window.matchMedia = originalMatchMedia;
    vi.resetModules();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/motionUtils.js");
    vi.doUnmock("../../src/helpers/cardUtils.js");
    vi.doUnmock("../../src/helpers/viewportDebug.js");
    vi.doUnmock("../../src/helpers/tooltipOverlayDebug.js");
    vi.doUnmock("../../src/helpers/testModeUtils.js");
    vi.doUnmock("../../src/helpers/domReady.js");
  });
  it("renders card text with sufficient color contrast", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const judoka = getJudokaFixture()[0];

    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const applyMotionPreference = vi.fn();

    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      loadSettings
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (_, opts = {}) => {
        const btn = document.createElement("button");
        if (opts.id) btn.id = opts.id;
        return btn;
      }
    }));
    vi.doMock("../../src/helpers/randomCard.js", async () => {
      const { JudokaCard } = await import("../../src/components/JudokaCard.js");
      return {
        generateRandomCard: async (_cards, _gokyo, container) => {
          const card = await new JudokaCard(judoka, {}).render();
          container.appendChild(card);
        }
      };
    });
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/constants.js", async () => ({
      ...(await vi.importActual("../../src/helpers/constants.js")),
      DATA_DIR: ""
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

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
    document.getElementById("draw-card-btn").click();
    await vi.runAllTimersAsync();
    container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));

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

    const generateRandomCard = vi.fn();
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
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      loadSettings
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

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

  it("updates loading state on draw button while drawing", async () => {
    vi.useFakeTimers();
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
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      loadSettings
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const button = document.getElementById("draw-card-btn");
    const label = button.querySelector(".button-label");

    button.click();
    await Promise.resolve();
    const card = container.querySelector(".card-container");
    expect(label.textContent).toBe("Drawing…");
    expect(button.getAttribute("aria-busy")).toBe("true");
    card.dispatchEvent(new Event("animationend"));
    expect(label.textContent).toBe("Draw Card!");
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("toggles history panel visibility", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);
    const createButton = vi.fn((_, opts = {}) => {
      const btn = document.createElement("button");
      if (opts.id) btn.id = opts.id;
      return btn;
    });
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
    vi.doMock("../../src/components/Button.js", () => ({ createButton }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const panel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    toggleBtn.click();
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    toggleBtn.click();
    expect(panel.getAttribute("aria-hidden")).toBe("true");
  });

  it("caps history at 5 entries", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const judokaSeq = [
      { firstname: "A", surname: "One" },
      { firstname: "B", surname: "Two" },
      { firstname: "C", surname: "Three" },
      { firstname: "D", surname: "Four" },
      { firstname: "E", surname: "Five" },
      { firstname: "F", surname: "Six" }
    ];
    let idx = 0;
    const generateRandomCard = vi
      .fn()
      .mockImplementation(async (_c, _g, container, _m, onSelect) => {
        const card = document.createElement("div");
        card.className = "card-container";
        container.appendChild(card);
        onSelect(judokaSeq[idx]);
        idx += 1;
      });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const createButton = vi.fn((_, opts = {}) => {
      const btn = document.createElement("button");
      if (opts.id) btn.id = opts.id;
      return btn;
    });
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
    vi.doMock("../../src/components/Button.js", () => ({ createButton }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const drawBtn = document.getElementById("draw-card-btn");
    for (let i = 0; i < judokaSeq.length; i++) {
      drawBtn.click();
      await Promise.resolve();
      container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));
    }

    const panel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    toggleBtn.click();
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    const items = Array.from(panel.querySelectorAll("li")).map((li) => li.textContent);
    expect(items).toEqual(["F Six", "E Five", "D Four", "C Three", "B Two"]);
  });

  it("disables draw button when data load fails", async () => {
    vi.useFakeTimers();
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
      await import("../../src/helpers/randomJudokaPage.js");
      document.dispatchEvent(new Event("DOMContentLoaded"));
      await vi.runAllTimersAsync();
    });

    const button = document.getElementById("draw-card-btn");
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const errorEl = document.getElementById("draw-error-message");
    expect(errorEl?.textContent).toMatch(/Unable to load judoka data/);
    fetchSpy.mockRestore();
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
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      loadSettings
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const drawBtn = document.getElementById("draw-card-btn");
    drawBtn.click();
    await vi.runAllTimersAsync();
    container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));

    expect(container.querySelector(".debug-panel")).toBeNull();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "settings",
        newValue: JSON.stringify({
          ...baseSettings,
          featureFlags: {
            ...baseSettings.featureFlags,
            enableCardInspector: {
              ...baseSettings.featureFlags.enableCardInspector,
              enabled: true
            }
          }
        })
      })
    );
    expect(container.querySelector(".debug-panel")).toBeTruthy();
  });
});
