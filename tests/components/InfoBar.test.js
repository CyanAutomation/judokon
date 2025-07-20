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

  it("initializes from existing DOM", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div class="battle-info-bar">
        <p id="round-message"></p>
        <p id="next-round-timer"></p>
        <p id="score-display"></p>
      </div>`;
    initInfoBar(document.querySelector(".battle-info-bar"));
    showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");
    updateScore(2, 3);
    expect(document.getElementById("score-display").textContent).toBe("You: 2 Computer: 3");
    startCountdown(1);
    expect(document.getElementById("next-round-timer").textContent).toBe("1");
    vi.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("0");
  });
});
