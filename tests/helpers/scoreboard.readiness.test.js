import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

describe("scoreboard readiness badge reflection", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    header.className = "header battle-header";
    const left = document.createElement("div");
    left.className = "scoreboard-left";
    left.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
    `;
    const right = document.createElement("div");
    right.className = "scoreboard-right";
    right.innerHTML = `
      <p id="score-display" aria-live="polite" aria-atomic="true"></p>
      <span id="next-ready-badge" aria-hidden="true" hidden></span>
    `;
    const controls = document.createElement("div");
    controls.innerHTML = `
      <button id="next-button" disabled>Next</button>
    `;
    header.append(left, controls, right);
    document.body.appendChild(header);
  });

  it("toggles #next-ready-badge hidden based on next button readiness", async () => {
    const scheduler = await import("./mockScheduler.js");
    const { setupScoreboard } = await import("../../src/helpers/setupScoreboard.js");
    const controls = { startCoolDown: vi.fn(), pauseTimer: vi.fn(), resumeTimer: vi.fn() };
    setupScoreboard(controls, scheduler.createMockScheduler());
    const nextButton = document.getElementById("next-button");
    const badge = document.getElementById("next-ready-badge");
    // Initially disabled => badge hidden
    expect(nextButton.disabled).toBe(true);
    expect(badge.hidden).toBe(true);
    // Enable next button => badge visible
    nextButton.disabled = false;
    await Promise.resolve();
    await Promise.resolve();
    expect(badge.hidden).toBe(false);
    // Disable again => badge hidden
    nextButton.disabled = true;
    await Promise.resolve();
    await Promise.resolve();
    expect(badge.hidden).toBe(true);
  });
});

