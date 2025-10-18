import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRandomJudokaPageHarness } from "./integrationHarness.js";
import { createRandomCardDom } from "../utils/testUtils.js";

const harness = createRandomJudokaPageHarness();

beforeEach(async () => {
  await harness.setup();
});

afterEach(() => {
  harness.cleanup();
});

describe("randomJudokaPage history panel", () => {
  it("toggles history panel visibility", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
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
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const panel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    toggleBtn.click();
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    toggleBtn.click();
    expect(panel.getAttribute("aria-hidden")).toBe("true");
  });

  it("caps history at 5 entries", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const judokaSeq = [
      { name: "A One", firstname: "A", surname: "One" },
      { name: "B Two", firstname: "B", surname: "Two" },
      { name: "C Three", firstname: "C", surname: "Three" },
      { name: "D Four", firstname: "D", surname: "Four" },
      { name: "E Five", firstname: "E", surname: "Five" },
      { name: "F Six", firstname: "F", surname: "Six" }
    ];
    let idx = 0;
    const generateRandomCard = vi
      .fn()
      .mockImplementation(async (_c, _g, container, _m, onSelect) => {
        const card = document.createElement("div");
        card.className = "card-container";
        container.appendChild(card);
        const judoka = judokaSeq[idx];
        onSelect(judoka);
        idx += 1;
        return judoka;
      });
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
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
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const drawBtn = document.getElementById("draw-card-btn");
    drawBtn.fallbackDelayMs = 0;
    drawBtn.timers = { setTimeout: () => 0, clearTimeout: () => {} };
    for (let i = 0; i < judokaSeq.length; i++) {
      drawBtn.click();
      await Promise.resolve();
      container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));
      await drawBtn.drawPromise;
    }

    const panel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    toggleBtn.click();
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    const items = Array.from(panel.querySelectorAll("li")).map((li) => li.textContent);
    expect(items).toEqual(["F Six", "E Five", "D Four", "C Three", "B Two"]);
  });

  it("moves focus to history title when panel opens", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
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
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const toggleBtn = document.getElementById("toggle-history-btn");
    const historyTitle = panel.querySelector("h2");

    // Open the panel
    toggleBtn.click();
    // Wait for the microtask that moves focus
    await Promise.resolve();

    // Focus should be on the history title
    expect(document.activeElement).toBe(historyTitle);
  });

  it("returns focus to toggle button when panel closes", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
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
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const toggleBtn = document.getElementById("toggle-history-btn");

    // Open and then close the panel
    toggleBtn.click();
    await Promise.resolve();
    toggleBtn.click();

    // Focus should return to the toggle button
    expect(document.activeElement).toBe(toggleBtn);
  });

  it("closes panel when Escape key is pressed", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
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
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const panel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");

    // Open the panel
    toggleBtn.click();
    await Promise.resolve();
    expect(panel.getAttribute("aria-hidden")).toBe("false");

    // Press Escape
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape"
    });
    document.dispatchEvent(escapeEvent);

    // Panel should close
    expect(panel.getAttribute("aria-hidden")).toBe("true");
  });

  it("restores focus to toggle button after Escape closes panel", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
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
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const toggleBtn = document.getElementById("toggle-history-btn");

    // Open the panel
    toggleBtn.click();
    await Promise.resolve();

    // Press Escape
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape"
    });
    document.dispatchEvent(escapeEvent);

    // Focus should be on the toggle button
    expect(document.activeElement).toBe(toggleBtn);
  });
});
