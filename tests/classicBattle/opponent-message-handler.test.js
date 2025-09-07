import { setOpponentDelay } from "../../src/helpers/classicBattle/snackbar.js";
import { bindUIHelperEventHandlersDynamic } from "../../src/helpers/classicBattle/uiEventHandlers.js";
import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";

describe("UI handlers: opponent message", () => {
  test("shows snackbar 'Opponent is choosing…' after statSelected", async () => {
    document.body.innerHTML = '<div id="snackbar-container"></div><div id="round-message"></div>';
    setOpponentDelay(10);
    bindUIHelperEventHandlersDynamic();
    emitBattleEvent("statSelected", { opts: {} });
    // Wait just beyond the configured delay
    await new Promise((r) => setTimeout(r, 15));
    const snack = document.getElementById("snackbar-container");
    expect(snack.textContent || "").toMatch(/Opponent is choosing/i);
  });
});
