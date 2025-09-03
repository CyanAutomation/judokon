import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";

const PAGES = ["battleJudoka", "battleClassic"];

const REQUIRED = [
  { id: "next-button", testId: "next-button", role: "next-round" },
  { id: "stat-help", testId: "stat-help" },
  { id: "quit-match-button", testId: "quit-match" }
];

function getMissingIds(root, ids) {
  return ids.filter((id) => !root.querySelector(`#${id}`));
}

function getMissingTestIds(root, testIds) {
  return testIds.filter((t) => !root.querySelector(`[data-testid="${t}"]`));
}

/**
 * @pseudocode
 * 1. Filter `roles` lacking a matching `data-role` in `root`.
 * @param {ParentNode} root
 * @param {string[]} roles
 * @returns {string[]} Missing role values.
 */
function getMissingRoles(root, roles) {
  return roles.filter((r) => !root.querySelector(`[data-role="${r}"]`));
}

describe.each(PAGES)("%s.html required hooks", (page) => {
  beforeEach(() => {
    const html = readFileSync(`src/pages/${page}.html`, "utf8");
    document.documentElement.innerHTML = html;
  });

  it("includes all required IDs", () => {
    const missing = getMissingIds(document, [...REQUIRED.map((r) => r.id), "stat-buttons"]);
    expect(missing).toEqual([]);
  });

  it("includes all required data-testid attributes", () => {
    const missing = getMissingTestIds(
      document,
      REQUIRED.map((r) => r.testId)
    );
    expect(missing).toEqual([]);
    const statButtons = document.querySelectorAll("#stat-buttons button");
    statButtons.forEach((btn) => expect(btn.getAttribute("data-testid")).toBe("stat-button"));
  });

  it("includes all required data-role attributes", () => {
    const roles = REQUIRED.map((r) => r.role).filter(Boolean);
    const missing = getMissingRoles(document, roles);
    expect(missing).toEqual([]);
  });

  it("detects when a data-testid is missing", () => {
    const el = document.querySelector('[data-testid="stat-help"]');
    el?.removeAttribute("data-testid");
    const missing = getMissingTestIds(
      document,
      REQUIRED.map((r) => r.testId)
    );
    expect(missing).toEqual(["stat-help"]);
  });
});
