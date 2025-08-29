import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
import {
  createScoreboard,
  initScoreboard,
  showMessage,
  clearMessage,
  showTemporaryMessage,
  updateScore
} from "../../src/components/Scoreboard.js";
import { createScoreboardHeader } from "../utils/testUtils.js";

describe("Scoreboard component", () => {
  let header;

  beforeEach(() => {
    header = document.createElement("header");
    createScoreboard(header);
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

  it("initializes from existing DOM", () => {
    document.body.innerHTML = "";
    const existing = createScoreboardHeader();
    document.body.appendChild(existing);
    initScoreboard(existing);
    showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");
    updateScore(2, 3);
    expect(document.getElementById("score-display").textContent).toBe("You: 2\nOpponent: 3");
  });
});
