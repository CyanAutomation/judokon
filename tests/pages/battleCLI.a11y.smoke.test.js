import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

const getTabbableElements = () =>
  Array.from(document.querySelectorAll("a[href], button, [tabindex]"))
    .filter((el) => !el.hasAttribute("disabled"))
    .filter((el) => el.tabIndex >= 0);

const createJSDOMUserEvent = () => ({
  async tab({ shift = false } = {}) {
    const tabbables = getTabbableElements();
    const active = document.activeElement;
    const currentIndex = active === document.body ? -1 : tabbables.indexOf(active);
    const delta = shift ? -1 : 1;
    const nextIndex = (currentIndex + delta + tabbables.length) % tabbables.length;
    active?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    tabbables[nextIndex]?.focus();
    tabbables[nextIndex]?.dispatchEvent(new KeyboardEvent("keyup", { key: "Tab", bubbles: true }));
    await Promise.resolve();
  }
});

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
    // hint is guaranteed to be truthy after the above assertion
    expect(hint.getAttribute("role")).toBe("note");
    expect(hint.getAttribute("aria-live")).toBe("polite");
    expect(hint?.hasAttribute("aria-hidden")).toBe(false);
    expect(hint.getAttribute("aria-describedby")).toBe("cli-controls-hint-announce");

    battleCLI.normalizeShortcutCopy();

    const keyRange = document.getElementById("cli-controls-key-range");
    expect(keyRange).toBeTruthy();
    expect(keyRange?.textContent).toBe("1–5");

    // Test that keyboard shortcut keys are exposed in the expected order for assistive tech
    const keyLabels = Array.from(hint.querySelectorAll(".cli-controls-hint__key") ?? []).map((el) =>
      el?.textContent?.trim()
    );
    expect(keyLabels).toEqual(["1–5", "Enter/Space", "H", "Q"]);

    // Verify the screen reader announcement contains full context and is exposed via aria-describedby
    const announcementEl = document.getElementById("cli-controls-hint-announce");
    expect(announcementEl).toBeTruthy();
    // announcementEl is guaranteed to be truthy after the above assertion
    expect(announcementEl.classList.contains("sr-only")).toBe(true);
    expect(announcementEl.getAttribute("aria-hidden")).toBeNull();
    expect(announcementEl.id).toBe("cli-controls-hint-announce");
    const announcement = announcementEl.textContent?.trim().replace(/\s+/g, " ");
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

  it("places skip link first in focus order", async () => {
    const cli = await loadBattleCLI();

    try {
      await cli.init();

      const user = createJSDOMUserEvent();
      const skip = document.querySelector("a.skip-link");
      const home = document.querySelector("[data-testid='home-link']");

      expect(skip?.tabIndex).toBe(0);
      expect(home?.tabIndex ?? 0).toBe(0);

      const positiveTabIndexElements = getTabbableElements().filter((el) => el.tabIndex > 0);
      expect(positiveTabIndexElements).toHaveLength(0);

      // Ensure no element is focused initially
      document.activeElement?.blur();

      await user.tab();
      expect(document.activeElement).toBe(skip);

      await user.tab();
      expect(document.activeElement).toBe(home);

      const lateFocusable = document.createElement("button");
      lateFocusable.type = "button";
      lateFocusable.id = "probe-focusable";
      lateFocusable.textContent = "Probe focus";
      document.getElementById("cli-root")?.append(lateFocusable);

      const tabbables = getTabbableElements();
      expect(tabbables[0]).toBe(skip);
      expect(tabbables[1]).toBe(home);

      // Clean up test element
      lateFocusable.remove();
    } finally {
      await cleanupBattleCLI();
      window.__TEST__ = true;
    }
  });

  describe("skip link interactions", () => {
    afterEach(async () => {
      await cleanupBattleCLI();
      window.__TEST__ = true;
    });

    it("focuses the main region when activated via keyboard", async () => {
      const cli = await loadBattleCLI();
      await cli.init();

      const focusables = Array.from(
        document.querySelectorAll("a[href], button, [tabindex]")
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);
      const skip = focusables[0];
      const main = document.getElementById("cli-main");

      expect(skip?.classList.contains("skip-link")).toBe(true);
      expect(main).toBeTruthy();

      skip?.focus();
      skip?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      skip?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      skip?.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));

      expect(document.activeElement).toBe(main);
    });

    it("preserves landmarks after CLI initialization and dynamic changes", async () => {
      const cli = await loadBattleCLI();
      await cli.init();

      const root = document.getElementById("cli-root");
      root?.insertAdjacentHTML("beforeend", '<div data-probe="true"></div>');

      expect(document.querySelector("a.skip-link")).toBeTruthy();
      expect(document.querySelector("header[role='banner']")).toBeTruthy();
      const main = document.querySelector("main[role='main']");
      expect(main).toBeTruthy();
      expect(main?.id).toBe("cli-main");
    });
  });
});
