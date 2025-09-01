import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStateSnapshot } from "../../../src/helpers/classicBattle/battleDebug.js";
import { onBattleEvent, offBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (cb) => {
    await cb?.();
  })
}));

describe("timeout → interruptRound → cooldown auto-advance", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <div id="player-card"></div>
      <div id="opponent-card"></div>
      <p id="round-message"></p>
      <p id="next-round-timer"></p>
      <button id="next-button" disabled>Next</button>
      <div id="snackbar-container"></div>
    `;
    // Use minimal 1s cooldown for auto-advance
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;
  });

  it("advances from cooldown after interrupt with 1s auto-advance", async () => {
    const { initClassicBattleOrchestrator } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    // minimal store
    const store = { selectionMade: false, playerChoice: null };
    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = (
      await import("../../../src/helpers/classicBattle/orchestrator.js")
    ).getBattleStateMachine();

    // Simulate match start then go to waitingForPlayerAction
    await machine.dispatch("matchStart");
    await machine.dispatch("ready"); // to cooldown
    await machine.dispatch("ready"); // to roundStart
    await machine.dispatch("cardsRevealed"); // to waitingForPlayerAction

    // Trigger timeout: machine goes to roundDecision then interruptRound(noSelection)
    await machine.dispatch("timeout");
    // Wait until cooldown is reached
    await waitForState("cooldown", 5000);

    // CooldownEnter should emit countdownStart and then auto-dispatch ready via fallback timer.
    // With the 1s floor, computeNextRoundCooldown() = 1 → auto-advance after ~1s to roundStart.
    await new Promise((r) => setTimeout(r, 1250));
    const snapshot = getStateSnapshot();
    expect(["roundStart", "waitingForPlayerAction"]).toContain(snapshot?.state);
  });
});

function waitForState(target, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (getStateSnapshot().state === target) return resolve();
    const handler = (e) => {
      if (e.detail?.to === target) {
        offBattleEvent("battleStateChange", handler);
        resolve();
      }
    };
    onBattleEvent("battleStateChange", handler);
    setTimeout(() => {
      offBattleEvent("battleStateChange", handler);
      reject(new Error(`timeout for ${target}`));
    }, timeout);
  });
}
