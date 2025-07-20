import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const originalReadyState = Object.getOwnPropertyDescriptor(document, "readyState");

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = "<header></header>";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
  if (originalReadyState) {
    Object.defineProperty(document, "readyState", originalReadyState);
  }
});

describe("setupBattleInfoBar", () => {
  it("inserts bar on DOMContentLoaded and proxies methods", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    vi.useFakeTimers();

    const mod = await import("../../src/helpers/setupBattleInfoBar.js");

    expect(document.querySelector(".battle-info-bar")).toBeNull();
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const bar = document.querySelector(".battle-info-bar");
    expect(bar).toBeTruthy();

    mod.showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");

    mod.updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1 Computer: 2");

    mod.startCountdown(1);
    expect(document.getElementById("next-round-timer").textContent).toBe("1");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("0");
  });

  it("initializes immediately when DOM already loaded", async () => {
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });

    await import("../../src/helpers/setupBattleInfoBar.js");

    expect(document.querySelector(".battle-info-bar")).toBeTruthy();
  });

  it("attaches to pre-existing bar", async () => {
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
    document.body.innerHTML = `<header></header><div class="battle-info-bar"><p id="round-message"></p><p id="next-round-timer"></p><p id="score-display"></p></div>`;
    const mod = await import("../../src/helpers/setupBattleInfoBar.js");
    mod.showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");
    mod.updateScore(3, 4);
    expect(document.getElementById("score-display").textContent).toBe("You: 3 Computer: 4");
    vi.useFakeTimers();
    mod.startCountdown(1);
    expect(document.getElementById("next-round-timer").textContent).toBe("1");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("0");
  });
});
