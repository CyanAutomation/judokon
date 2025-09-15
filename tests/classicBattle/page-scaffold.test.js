import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { init } from "../../src/pages/battleClassic.init.js";
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";

describe("Classic Battle page scaffold (behavioral)", () => {
  beforeEach(() => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;
    // Provide stable overrides and storage to avoid side effects
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
    vi.resetModules();
    vi.clearAllMocks();
  });

  test("initializes scoreboard regions and default content", async () => {
    await init();

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    // Regions present
    const msg = header.querySelector("#round-message");
    const timer = header.querySelector("#next-round-timer");
    const round = header.querySelector("#round-counter");
    const score = header.querySelector("#score-display");
    expect(msg).toBeTruthy();
    expect(timer).toBeTruthy();
    expect(round).toBeTruthy();
    expect(score).toBeTruthy();

    // ARIA roles / live regions remain correct after init
    for (const el of [msg, timer]) {
      expect(el.getAttribute("role")).toBe("status");
      expect(el.getAttribute("aria-live")).toBe("polite");
      expect(el.getAttribute("aria-atomic")).toBe("true");
    }

    // Default content visible and readable
    expect(score.textContent).toContain("You: 0");
    expect(score.textContent).toContain("Opponent: 0");
    expect(round.textContent).toContain("Round 0");
  });
});
