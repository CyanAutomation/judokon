import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle end-of-match modal", () => {
  test("renders with Replay and Quit when invoked", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { winner: "player", scores: { player: 1, opponent: 0 } });
    const modal = document.getElementById("match-end-modal");
    expect(modal).toBeTruthy();
    expect(document.getElementById("match-replay-button")).toBeTruthy();
    expect(document.getElementById("match-quit-button")).toBeTruthy();
  });
});
