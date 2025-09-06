import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("battleCLI.html static selectors", () => {
  it("exposes required DOM hooks", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    document.documentElement.innerHTML = html;
    expect(document.getElementById("cli-countdown")).toBeTruthy();
    expect(document.getElementById("round-message")).toBeTruthy();
    expect(document.getElementById("cli-score")).toBeTruthy();
    const root = document.getElementById("cli-root");
    expect(root?.getAttribute("data-round")).not.toBeNull();
    expect(root?.getAttribute("data-target")).not.toBeNull();
    const countdown = document.getElementById("cli-countdown");
    expect(countdown?.getAttribute("data-remaining-time")).not.toBeNull();
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
