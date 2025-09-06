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

  it("updates message and score", async () => {
    vi.useFakeTimers();
    showMessage("Hello");
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("Hello");

    updateScore(1, 2);
    const player = document.querySelector('#score-display span[data-side="player"]');
    const opponent = document.querySelector('#score-display span[data-side="opponent"]');
    expect(player?.textContent).toBe("You: 1");
    expect(opponent?.textContent.trim()).toBe("Opponent: 2");
  });

  it("clears and temporarily shows messages", async () => {
    vi.useFakeTimers();
    showMessage("Persist");
    clearMessage();
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("");

    const clear = showTemporaryMessage("Temp");
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("Temp");
    clear();
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("");
  });

  it("initializes from existing DOM", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    const existing = createScoreboardHeader();
    document.body.appendChild(existing);
    initScoreboard(existing);
    showMessage("Hi");
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("Hi");
    updateScore(2, 3);
    const player = document.querySelector('#score-display span[data-side="player"]');
    const opponent = document.querySelector('#score-display span[data-side="opponent"]');
    expect(player?.textContent).toBe("You: 2");
    expect(opponent?.textContent.trim()).toBe("Opponent: 3");
  });

  it("prevents placeholders from overriding localized outcomes", async () => {
    vi.useFakeTimers();
    showMessage("¡Ganas la ronda!", { outcome: true });
    await vi.advanceTimersByTimeAsync(220);
    showMessage("Waiting…");
    const msg = document.getElementById("round-message");
    expect(msg.textContent).toBe("¡Ganas la ronda!");
    expect(msg.dataset.outcome).toBe("true");
    // Within 1s, non-outcome messages are blocked
    showMessage("Next round");
    expect(msg.textContent).toBe("¡Ganas la ronda!");
    // After 1s, allow downgrade
    await vi.advanceTimersByTimeAsync(1200);
    showMessage("Next round");
    await vi.advanceTimersByTimeAsync(220);
    expect(msg.textContent).toBe("Next round");
    expect(msg.dataset.outcome).toBeUndefined();
  });

  it("allows fallback placeholder when no outcome is set", async () => {
    vi.useFakeTimers();
    showMessage("Some info");
    showMessage("Waiting…");
    await vi.advanceTimersByTimeAsync(220);
    const msg = document.getElementById("round-message");
    expect(msg.textContent).toBe("Waiting…");
    expect(msg.dataset.outcome).toBeUndefined();
  });
});
