import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";

const PAGES = ["battleJudoka", "battleClassic"];

const REQUIRED_SELECTORS = ['[data-role="next-round"]', "#stat-help", "#quit-match-button"];

const REQUIRED_TEST_IDS = ["next-button", "stat-help", "quit-match"];

function getMissingSelectors(root, selectors) {
  return selectors.filter((s) => !root.querySelector(s));
}

function getMissingTestIds(root, testIds) {
  return testIds.filter((t) => !root.querySelector(`[data-testid="${t}"]`));
}

describe.each(PAGES)("%s.html required hooks", (page) => {
  beforeEach(() => {
    const html = readFileSync(`src/pages/${page}.html`, "utf8");
    document.documentElement.innerHTML = html;
  });

  it("includes all required IDs", () => {
    const missing = getMissingSelectors(document, [...REQUIRED_SELECTORS, "#stat-buttons"]);
    expect(missing).toEqual([]);
  });

  it("includes all required data-testid attributes", () => {
    const missing = getMissingTestIds(document, REQUIRED_TEST_IDS);
    expect(missing).toEqual([]);
    const statButtons = document.querySelectorAll("#stat-buttons button");
    statButtons.forEach((btn) => expect(btn.getAttribute("data-testid")).toBe("stat-button"));
  });

  it("detects when a data-testid is missing", () => {
    const el = document.querySelector('[data-testid="stat-help"]');
    el?.removeAttribute("data-testid");
    const missing = getMissingTestIds(document, REQUIRED_TEST_IDS);
    expect(missing).toEqual(["stat-help"]);
  });

  it("next button has id next-button", () => {
    const next = document.querySelector('[data-role="next-round"]');
    expect(next?.id).toBe("next-button");
  });
});
