import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";

// IDs referenced by battleJudoka scripts for event handlers and DOM queries
// Removing any of these would break associated user interactions
const REQUIRED_IDS = ["next-button", "stat-help", "quit-match-button", "stat-buttons"];

function getMissingIds(root, ids) {
  return ids.filter((id) => !root.getElementById(id));
}

describe("battleJudoka.html required IDs", () => {
  beforeEach(() => {
    const html = readFileSync("src/pages/battleJudoka.html", "utf8");
    document.documentElement.innerHTML = html;
  });

  it("includes all required IDs", () => {
    const missing = getMissingIds(document, REQUIRED_IDS);
    expect(missing).toEqual([]);
  });

  it("detects when an ID is missing", () => {
    document.getElementById("stat-help")?.remove();
    const missing = getMissingIds(document, REQUIRED_IDS);
    expect(missing).toEqual(["stat-help"]);
  });
});
