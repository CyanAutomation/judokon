import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (cb) => { await cb?.(); })
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
    // Force zero cooldown for quick auto-advance
    window.__NEXT_ROUND_COOLDOWN_MS = 0;
  });

  it("advances from cooldown after interrupt without hanging", async () => {
    const { initClassicBattleOrchestrator } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    // minimal store
    const store = { selectionMade: false, playerChoice: null };
    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = (await import("../../../src/helpers/classicBattle/orchestrator.js")).getBattleStateMachine();

    // Simulate match start then go to waitingForPlayerAction
    await machine.dispatch("matchStart");
    await machine.dispatch("ready"); // to cooldown
    await machine.dispatch("ready"); // to roundStart
    await machine.dispatch("cardsRevealed"); // to waitingForPlayerAction

    // Trigger timeout: machine goes to roundDecision then interruptRound(noSelection)
    await machine.dispatch("timeout");
    // Wait until cooldown is reached
    await window.awaitBattleState?.("cooldown", 5000);

    // CooldownEnter should emit countdownStart and then auto-dispatch ready via fallback timer.
    // With test mode, computeNextRoundCooldown() = 0 → auto-advance immediately to roundStart.
    await new Promise((r) => setTimeout(r, 450));
    const snapshot = window.getBattleStateSnapshot?.();
    expect(["roundStart", "waitingForPlayerAction"]).toContain(snapshot?.state);
  });
});
