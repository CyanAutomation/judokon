import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInfoBar,
  initInfoBar,
  showMessage,
  startCountdown,
  updateScore
} from "../../src/components/InfoBar.js";
import { createInfoBarHeader } from "../utils/testUtils.js";

describe("InfoBar component", () => {
  let header;

  beforeEach(() => {
    header = document.createElement("header");
    createInfoBar(header);
    document.body.appendChild(header);
  });

  it("creates DOM structure with proper aria attributes", () => {
    const msg = header.querySelector("#round-message");
    const timer = header.querySelector("#next-round-timer");
    const score = header.querySelector("#score-display");
    expect(msg).toHaveAttribute("aria-live", "polite");
    expect(msg).toHaveAttribute("role", "status");
    expect(msg).toHaveAttribute("aria-atomic", "true");
    expect(timer).toHaveAttribute("aria-live", "polite");
    expect(timer).toHaveAttribute("role", "status");
    expect(timer).toHaveAttribute("aria-atomic", "true");
    expect(score).toHaveAttribute("aria-live", "off");
    expect(score).toHaveAttribute("aria-atomic", "true");
  });

  it("updates message and score", () => {
    showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");

    updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1\nOpponent: 2");
  });

  it("startCountdown updates timer each second", () => {
    const timer = vi.useFakeTimers();
    startCountdown(2);
    expect(document.getElementById("next-round-timer").textContent).toBe("Next round in: 2s");
    timer.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Next round in: 1s");
    timer.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Next round in: 0s");
    timer.clearAllTimers();
  });

  it("initializes from existing DOM", () => {
    const timer = vi.useFakeTimers();
    document.body.innerHTML = "";
    const existing = createInfoBarHeader();
    document.body.appendChild(existing);
    initInfoBar(existing);
    showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");
    updateScore(2, 3);
    expect(document.getElementById("score-display").textContent).toBe("You: 2\nOpponent: 3");
    startCountdown(1);
    expect(document.getElementById("next-round-timer").textContent).toBe("Next round in: 1s");
    timer.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Next round in: 0s");
    timer.clearAllTimers();
  });
});
