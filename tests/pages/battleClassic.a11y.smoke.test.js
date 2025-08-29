import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("battleClassic.html a11y regions", () => {
  it("includes main ARIA regions and labeled stat buttons", () => {
    const html = readFileSync("src/pages/battleClassic.html", "utf8");
    // Inject full HTML into JSDOM
    document.documentElement.innerHTML = html;

    const roundMsg = document.getElementById("round-message");
    const nextTimer = document.getElementById("next-round-timer");
    const roundCounter = document.getElementById("round-counter");
    expect(roundMsg).toBeTruthy();
    expect(nextTimer).toBeTruthy();
    expect(roundCounter).toBeTruthy();
    expect(roundMsg?.getAttribute("role")).toBe("status");
    expect(nextTimer?.getAttribute("role")).toBe("status");
    // round-counter can be a polite live region without role
    expect(roundCounter?.getAttribute("aria-live")).toBe("polite");

    const btns = Array.from(document.querySelectorAll("#stat-buttons button"));
    expect(btns.length).toBeGreaterThanOrEqual(5);
    btns.forEach((b) => {
      const hasLabel = !!b.getAttribute("aria-label");
      const hasDesc = !!b.getAttribute("aria-describedby");
      expect(hasLabel || hasDesc).toBe(true);
    });
  });
});
