import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRandomJudokaPageHarness } from "./integrationHarness.js";
import { createRandomCardDom } from "../utils/testUtils.js";
import { naturalClick } from "../utils/componentTestUtils.js";

const harness = createRandomJudokaPageHarness();

beforeEach(async () => {
  await harness.setup();
});

afterEach(() => {
  harness.cleanup();
});

describe("randomJudokaPage history panel", () => {
  it("toggles history panel visibility via details element", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();
    const preloadRandomCardData = vi
      .fn()
      .mockResolvedValue({ judokaData: [], gokyoData: [], error: null });

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard,
      preloadRandomCardData
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const historyPanel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");
    expect(historyPanel.open).toBe(false);

    naturalClick(toggleBtn);
    await Promise.resolve();
    expect(historyPanel.open).toBe(true);

    naturalClick(toggleBtn);
    await Promise.resolve();
    expect(historyPanel.open).toBe(false);
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
    const preloadRandomCardData = vi
      .fn()
      .mockResolvedValue({ judokaData: [], gokyoData: [], error: null });

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard,
      preloadRandomCardData
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

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

    const historyPanel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");
    expect(historyPanel.open).toBe(false);

    naturalClick(toggleBtn);
    await Promise.resolve();
    expect(historyPanel.open).toBe(true);

    const items = Array.from(historyPanel.querySelectorAll("li")).map((li) => li.textContent);
    expect(items).toEqual(["F Six", "E Five", "D Four", "C Three", "B Two"]);
  });

  it("moves focus to toggle button when panel opens", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();
    const preloadRandomCardData = vi
      .fn()
      .mockResolvedValue({ judokaData: [], gokyoData: [], error: null });

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard,
      preloadRandomCardData
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const toggleBtn = document.getElementById("toggle-history-btn");

    // Open the panel
    naturalClick(toggleBtn);
    // Wait for the microtask that moves focus
    await Promise.resolve();

    // Focus should be on the toggle button (summary element)
    expect(document.activeElement).toBe(toggleBtn);
  });

  it("returns focus to toggle button when panel closes", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();
    const preloadRandomCardData = vi
      .fn()
      .mockResolvedValue({ judokaData: [], gokyoData: [], error: null });

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard,
      preloadRandomCardData
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const toggleBtn = document.getElementById("toggle-history-btn");

    // Open and then close the panel
    naturalClick(toggleBtn);
    await Promise.resolve();
    naturalClick(toggleBtn);

    // Focus should return to the toggle button
    await Promise.resolve();
    expect(document.activeElement).toBe(toggleBtn);
  });
});
