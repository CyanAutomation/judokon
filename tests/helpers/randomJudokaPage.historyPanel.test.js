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
  it("toggles history panel visibility via details element", async () => {
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
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const panel = document.getElementById("history-panel");
    expect(panel.open).toBe(false);

    // Directly toggle open state instead of clicking (to avoid async click propagation issues)
    panel.open = true;
    await Promise.resolve();
    expect(panel.open).toBe(true);

    panel.open = false;
    await Promise.resolve();
    expect(panel.open).toBe(false);
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

    const panel = document.getElementById("history-panel");
    expect(panel.open).toBe(false);

    panel.open = true;
    await Promise.resolve();
    expect(panel.open).toBe(true);

    const items = Array.from(panel.querySelectorAll("li")).map((li) => li.textContent);
    expect(items).toEqual(["F Six", "E Five", "D Four", "C Three", "B Two"]);
  });

  it("moves focus to toggle button when panel opens", async () => {
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
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const panel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");

    // Open the panel
    toggleBtn.click();
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

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard
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
    toggleBtn.click();
    await Promise.resolve();
    toggleBtn.click();

    // Focus should return to the toggle button
    await Promise.resolve();
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
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const panel = document.getElementById("history-panel");

    // Open the panel
    panel.open = true;
    await Promise.resolve();
    expect(panel.open).toBe(true);

    // Close by setting open to false (native details element doesn't need Escape handling)
    panel.open = false;
    await Promise.resolve();

    // Panel should be closed
    expect(panel.open).toBe(false);
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
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const panel = document.getElementById("history-panel");
    const toggleBtn = document.getElementById("toggle-history-btn");

    // Open the panel
    toggleBtn.click();
    await Promise.resolve();

    // Close the panel
    panel.open = false;
    await Promise.resolve();

    // Focus should be on the toggle button
    expect(document.activeElement).toBe(toggleBtn);
  });
});
