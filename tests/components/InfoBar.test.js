import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createInfoBar,
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
    const bar = createInfoBar();
    expect(bar.classList.contains("battle-info-bar")).toBe(true);
    const msg = bar.querySelector("#round-message");
    const timer = bar.querySelector("#next-round-timer");
    const score = bar.querySelector("#score-display");
    expect(msg.getAttribute("aria-live")).toBe("polite");
    expect(timer.getAttribute("aria-live")).toBe("polite");
    expect(score.getAttribute("aria-live")).toBe("off");
  });

  it("updates message, score and countdown", () => {
    vi.useFakeTimers();
    const bar = createInfoBar();
    document.body.appendChild(bar);

    showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");

    updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1 Computer: 2");

    startCountdown(2);
    expect(document.getElementById("next-round-timer").textContent).toBe("2");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("1");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("0");
  });
});
