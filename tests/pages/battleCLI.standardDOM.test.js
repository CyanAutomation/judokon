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

  it("should keep scoreboard nodes visible within the CLI header", () => {
    const nodes = [
      document.getElementById("next-round-timer"),
      document.getElementById("round-counter"),
      document.getElementById("score-display")
    ];

    nodes.forEach((node) => {
      expect(node).toBeTruthy();
      expect(node.getAttribute("aria-hidden")).not.toBe("true");
      expect(window.getComputedStyle(node).display).not.toBe("none");
    });
  });

  it("should maintain CLI-specific attributes alongside shared nodes", () => {
    expect(document.getElementById("cli-countdown")).toBeTruthy();
    const score = document.getElementById("score-display");
    expect(score.dataset.scorePlayer).toBe("0");
    expect(score.dataset.scoreOpponent).toBe("0");
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

    expect(score.getAttribute("aria-live")).toBe("polite");
    expect(score.getAttribute("aria-atomic")).toBe("true");
    expect(score.getAttribute("role")).toBe("status");

    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(message.getAttribute("aria-atomic")).toBe("true");
    expect(message.getAttribute("role")).toBe("status");
  });
});
