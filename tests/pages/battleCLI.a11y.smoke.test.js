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
  });

  it("includes static controls hint near footer", () => {
    const hint = document.getElementById("cli-controls-hint");
    expect(hint).toBeTruthy();
    expect(hint?.getAttribute("aria-hidden")).toBe("true");
    expect(hint?.textContent?.trim()).toBe(
      "[1–5] Stats · [Enter/Space] Next · [H] Help · [Q] Quit"
    );
  });

  it("includes skip link and landmark roles", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    document.documentElement.innerHTML = html;
    const skip = document.querySelector("a.skip-link");
    expect(skip).toBeTruthy();
    expect(skip?.getAttribute("href")).toBe("#cli-main");
    expect(document.querySelector("header[role='banner']")).toBeTruthy();
    expect(document.querySelector("main[role='main']")).toBeTruthy();
  });

  it("places skip link first in focus order", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    document.documentElement.innerHTML = html;
    const focusables = Array.from(document.querySelectorAll("a[href], button, [tabindex]")).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0
    );
    expect(focusables[0]?.classList.contains("skip-link")).toBe(true);
    expect(focusables[1]?.getAttribute("data-testid")).toBe("home-link");
  });
});
