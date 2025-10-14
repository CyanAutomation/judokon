import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRandomJudokaPageHarness } from "./integrationHarness.js";
import { createRandomCardDom } from "../utils/testUtils.js";

const harness = createRandomJudokaPageHarness();

beforeEach(async () => {
  await harness.setup();
});

describe("randomJudokaPage history panel", () => {
  it("toggles history panel visibility", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
    const loadGokyoLookup = vi.fn().mockResolvedValue({});

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard, loadGokyoLookup }));
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

    const applyMotionPreference = vi.fn();
    const loadGokyoLookup = vi.fn().mockResolvedValue({});

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard, loadGokyoLookup }));
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
});