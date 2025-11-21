// @vitest-environment jsdom
import { readFileSync } from "node:fs";

// Defer reading HTML file until after jsdom is setup
let htmlContent;
function getHtmlContent() {
  if (!htmlContent) {
    htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return htmlContent;
}

describe("Classic Battle end-of-match modal", () => {
  test("renders with Replay and Quit when invoked", async () => {
    document.documentElement.innerHTML = getHtmlContent();
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { winner: "player", scores: { player: 1, opponent: 0 } });
    const modal = document.getElementById("match-end-modal");
    expect(modal).toBeTruthy();
    expect(document.getElementById("match-replay-button")).toBeTruthy();
    expect(document.getElementById("match-quit-button")).toBeTruthy();
  });

  test("renders quit outcome messaging with scores", async () => {
    document.documentElement.innerHTML = htmlContent;
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { outcome: "quit", scores: { player: 1, opponent: 0 } });
    const desc = document.getElementById("match-end-desc");
    expect(desc?.textContent).toBe("You quit the match. You lose! (1-0)");
  });
});
