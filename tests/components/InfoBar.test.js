import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
import {
  createInfoBar,
  initInfoBar,
  showMessage,
  clearMessage,
  showTemporaryMessage,
  startCountdown,
  updateScore
} from "../../src/components/InfoBar.js";
import * as battleEngine from "../../src/helpers/battleEngine.js";
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
    expect(score).toHaveAttribute("aria-live", "polite");
    expect(score).toHaveAttribute("aria-atomic", "true");
  });

  it("updates message and score", () => {
    showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");

    updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1\nOpponent: 2");
  });

  it("clears and temporarily shows messages", () => {
    showMessage("Persist");
    clearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");

    const clear = showTemporaryMessage("Temp");
    expect(document.getElementById("round-message").textContent).toBe("Temp");
    clear();
    expect(document.getElementById("round-message").textContent).toBe("");
  });

  it("startCountdown updates timer each second", () => {
    const timer = vi.useFakeTimers();
    startCountdown(2);
    expect(document.getElementById("next-round-timer").textContent).toBe("Next round in: 2s");
    timer.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Next round in: 1s");
    timer.advanceTimersByTime(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("");
    timer.clearAllTimers();
  });

  it("startCountdown displays fallback on drift", () => {
    const timer = vi.useFakeTimers();
    const watchSpy = vi.spyOn(battleEngine, "watchForDrift");
    startCountdown(2);
    const [, onDrift] = watchSpy.mock.calls[0];
    onDrift(1);
    expect(document.getElementById("round-message").textContent).toBe("Waiting…");
    timer.clearAllTimers();
    watchSpy.mockRestore();
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
    expect(document.getElementById("next-round-timer").textContent).toBe("");
    timer.clearAllTimers();
  });
});
