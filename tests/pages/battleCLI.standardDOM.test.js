import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("battleCLI standard DOM nodes (Phase 1)", () => {
  beforeEach(() => {
    // Load real CLI HTML to assert contracts against source markup
    const file = resolve(process.cwd(), "src/pages/battleCLI.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
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
    expect(timer.getAttribute("role")).toBe("status");
    expect(timer.getAttribute("aria-atomic")).toBe("true");

    // Round counter is atomic; live politeness is provided when rendered dynamically
    expect(counter.getAttribute("aria-atomic")).toBe("true");

    expect(score.getAttribute("aria-live")).toBe("off");
    expect(score.getAttribute("aria-atomic")).toBe("true");

    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(message.getAttribute("aria-atomic")).toBe("true");
    expect(message.getAttribute("role")).toBe("status");
  });
});
