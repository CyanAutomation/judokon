import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const originalReadyState = Object.getOwnPropertyDescriptor(document, "readyState");

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = `
    <header>
      <p id="round-message"></p>
      <p id="next-round-timer"></p>
      <p id="score-display"></p>
    </header>`;
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
  it("initializes on DOMContentLoaded and proxies methods", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    vi.useFakeTimers();

    const mod = await import("../../src/helpers/setupBattleInfoBar.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    mod.showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");

    mod.updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1 Computer: 2");

    mod.startCountdown(1);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 1s");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 0s");
  });

  it("initializes immediately when DOM already loaded", async () => {
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });

    await import("../../src/helpers/setupBattleInfoBar.js");

    expect(document.getElementById("score-display")).toBeTruthy();
  });

  it("attaches to pre-existing elements", async () => {
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
    document.body.innerHTML = `<header><p id="round-message"></p><p id="next-round-timer"></p><p id="score-display"></p></header>`;
    const mod = await import("../../src/helpers/setupBattleInfoBar.js");
    mod.showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");
    mod.updateScore(3, 4);
    expect(document.getElementById("score-display").textContent).toBe("You: 3 Computer: 4");
    vi.useFakeTimers();
    mod.startCountdown(1);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 1s");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 0s");
  });
});
