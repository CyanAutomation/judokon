import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

describe("battleCLI accessibility smoke tests", () => {
  beforeEach(() => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    document.documentElement.innerHTML = html;
  });

  it("marks countdown and round message as polite live regions", () => {
    const roundMsg = document.getElementById("round-message");
    const countdown = document.getElementById("cli-countdown");
    expect(roundMsg?.getAttribute("role")).toBe("status");
    expect(roundMsg?.getAttribute("aria-live")).toBe("polite");
    expect(countdown?.getAttribute("role")).toBe("status");
    expect(countdown?.getAttribute("aria-live")).toBe("polite");
  });

  it("includes static controls hint near footer", () => {
    const hint = document.getElementById("cli-controls-hint");
    expect(hint).toBeTruthy();
    expect(hint?.getAttribute("aria-hidden")).toBe("true");
    expect(hint?.textContent?.trim()).toBe(
      "[1–5] Stats · [Enter/Space] Next · [H] Help · [Q] Quit"
    );
  });
});
