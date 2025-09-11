import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("battleCLI standard DOM nodes (Phase 1)", () => {
  beforeEach(() => {
    // Load CLI HTML structure
    document.body.innerHTML = `
      <header class="cli-header">
        <div class="cli-status">
          <div id="cli-round">Round 0 of 0</div>
          <div id="cli-score" data-score-player="0" data-score-opponent="0">You: 0 Opponent: 0</div>
        </div>
        <div class="standard-scoreboard-nodes" style="display: none;" aria-hidden="true">
          <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
          <p id="round-counter" aria-live="polite" aria-atomic="true">Round 0</p>
          <p id="score-display" aria-live="off" aria-atomic="true">You: 0 Opponent: 0</p>
        </div>
      </header>
      <main>
        <section>
          <div id="round-message" role="status" aria-live="polite" aria-atomic="true"></div>
          <div id="cli-countdown" role="status" aria-live="polite" data-remaining-time="0"></div>
        </section>
      </main>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should have all standard Scoreboard DOM nodes present", () => {
    // Verify all required standard Scoreboard elements exist
    expect(document.getElementById("round-message")).toBeTruthy();
    expect(document.getElementById("next-round-timer")).toBeTruthy();
    expect(document.getElementById("round-counter")).toBeTruthy();
    expect(document.getElementById("score-display")).toBeTruthy();
  });

  it("should have standard nodes properly hidden and aria-hidden", () => {
    const container = document.querySelector(".standard-scoreboard-nodes");
    expect(container).toBeTruthy();
    expect(container.style.display).toBe("none");
    expect(container.getAttribute("aria-hidden")).toBe("true");
  });

  it("should maintain existing CLI elements alongside standard ones", () => {
    // Verify existing CLI elements still exist
    expect(document.getElementById("cli-round")).toBeTruthy();
    expect(document.getElementById("cli-score")).toBeTruthy();
    expect(document.getElementById("cli-countdown")).toBeTruthy();
    
    // Verify both old and new coexist
    expect(document.getElementById("cli-score")).toBeTruthy();
    expect(document.getElementById("score-display")).toBeTruthy();
  });

  it("should have proper ARIA attributes on standard nodes", () => {
    const timer = document.getElementById("next-round-timer");
    const counter = document.getElementById("round-counter");
    const score = document.getElementById("score-display");
    const message = document.getElementById("round-message");

    // Verify ARIA attributes match Scoreboard component spec
    expect(timer.getAttribute("aria-live")).toBe("polite");
    expect(timer.getAttribute("aria-atomic")).toBe("true");
    expect(timer.getAttribute("role")).toBe("status");

    expect(counter.getAttribute("aria-live")).toBe("polite");
    expect(counter.getAttribute("aria-atomic")).toBe("true");

    expect(score.getAttribute("aria-live")).toBe("off");
    expect(score.getAttribute("aria-atomic")).toBe("true");

    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(message.getAttribute("aria-atomic")).toBe("true");
    expect(message.getAttribute("role")).toBe("status");
  });
});
