import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

import { createScoreboard, initScoreboard, showMessage } from "../../src/components/Scoreboard.js";

describe("Scoreboard outcome message persistence (>=1s)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    createScoreboard(header);
    document.body.appendChild(header);
    initScoreboard(header);
  });

  it("blocks overwrites (incl. placeholders) within 1s window", async () => {
    showMessage("You win!", { outcome: true });
    // Allow debouncer to flush initial outcome
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("You win!");
    // Attempt to overwrite with a placeholder within 200ms (still within 1s lock)
    await vi.advanceTimersByTimeAsync(200);
    showMessage("Waiting…");
    expect(document.getElementById("round-message").textContent).toBe("You win!");
    // Attempt to overwrite with a normal message within 800ms total
    await vi.advanceTimersByTimeAsync(600);
    showMessage("Next round");
    expect(document.getElementById("round-message").textContent).toBe("You win!");
    // After 1s, non-outcome message can replace it
    await vi.advanceTimersByTimeAsync(300);
    showMessage("Next round");
    // Allow debouncer to flush
    await vi.advanceTimersByTimeAsync(250);
    expect(document.getElementById("round-message").textContent).toBe("Next round");
  });
});
