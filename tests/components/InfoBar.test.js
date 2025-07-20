import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createInfoBar,
  initInfoBar,
  showMessage,
  startCountdown,
  updateScore
} from "../../src/components/InfoBar.js";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("InfoBar component", () => {
  it("creates DOM structure with proper aria attributes", () => {
    const header = document.createElement("header");
    const bar = createInfoBar(header);
    const msg = bar.querySelector("#round-message");
    const timer = bar.querySelector("#next-round-timer");
    const score = bar.querySelector("#score-display");
    expect(msg.getAttribute("aria-live")).toBe("polite");
    expect(timer.getAttribute("aria-live")).toBe("polite");
    expect(score.getAttribute("aria-live")).toBe("off");
  });

  it("updates message, score and countdown", () => {
    vi.useFakeTimers();
    const header = document.createElement("header");
    createInfoBar(header);
    document.body.appendChild(header);

    showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");

    updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1 Computer: 2");

    startCountdown(2);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 2s");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 1s");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 0s");
  });

  it("initializes from existing DOM", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <header>
        <p id="round-message"></p>
        <p id="next-round-timer"></p>
        <p id="score-display"></p>
      </header>`;
    initInfoBar(document.querySelector("header"));
    showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");
    updateScore(2, 3);
    expect(document.getElementById("score-display").textContent).toBe("You: 2 Computer: 3");
    startCountdown(1);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 1s");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 0s");
  });
});
