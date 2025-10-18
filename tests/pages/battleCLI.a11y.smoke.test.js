import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { readFileSync } from "node:fs";

let battleCLI;

beforeAll(async () => {
  window.__TEST__ = true;
  ({ battleCLI } = await import("../../src/pages/index.js"));
});

afterAll(() => {
  vi.resetModules();
  delete window.__TEST__;
});

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
    if (!hint) {
      throw new Error("cli-controls-hint should be present in the DOM");
    }
    expect(hint.getAttribute("role")).toBe("note");
    expect(hint.getAttribute("aria-live")).toBe("polite");
    expect(hint.getAttribute("aria-hidden")).toBe("true");
    expect(hint.getAttribute("aria-describedby")).toBe("cli-controls-hint-announce");

    battleCLI.normalizeShortcutCopy();

    const keyRange = document.getElementById("cli-controls-key-range");
    expect(keyRange).toBeTruthy();
    expect(keyRange?.textContent).toBe("1–5");

    // Test that keyboard shortcut keys are exposed in the expected order for assistive tech
    const keyLabels = Array.from(
      hint.querySelectorAll(".cli-controls-hint__key") ?? []
    ).map((el) => el?.textContent?.trim());
    expect(keyLabels).toEqual(["1–5", "Enter/Space", "H", "Q"]);

    // Verify the screen reader announcement contains full context and is exposed via aria-describedby
    const announcementEl = document.getElementById("cli-controls-hint-announce");
    expect(announcementEl).toBeTruthy();
    if (!announcementEl) {
      throw new Error("cli-controls-hint-announce should be present in the DOM");
    }
    expect(announcementEl.classList.contains("sr-only")).toBe(true);
    expect(announcementEl.hasAttribute("aria-hidden")).toBe(false);
    expect(announcementEl.id).toBe("cli-controls-hint-announce");
    expect(hint.getAttribute("aria-describedby")).toBe(announcementEl.id);
    const announcement = announcementEl.textContent?.trim();
    expect(announcement).toBe(
      "Use keys 1 through 5 to choose a stat, Enter or Space to continue, H to toggle help, and Q to quit."
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
