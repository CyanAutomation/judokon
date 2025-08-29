import { describe, it, expect, vi, beforeEach } from "vitest";

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
  // eslint-disable-next-line no-console
  console.log("DIAG: state after matchStart ->", machine.getState());
  await machine.dispatch("ready"); // to cooldown
  // eslint-disable-next-line no-console
  console.log("DIAG: state after first ready ->", machine.getState());
  await machine.dispatch("ready"); // to roundStart
  // eslint-disable-next-line no-console
  console.log("DIAG: state after second ready ->", machine.getState());
  await machine.dispatch("cardsRevealed"); // to waitingForPlayerAction
  // eslint-disable-next-line no-console
  console.log("DIAG: state after cardsRevealed ->", machine.getState());

    // Trigger timeout: machine goes to roundDecision then interruptRound(noSelection)
  await machine.dispatch("timeout");
  // eslint-disable-next-line no-console
  console.log("DIAG: state after timeout dispatch ->", machine.getState());
    // Diagnostic: dump state snapshot and any registered waiters to diagnose why cooldown wasn't reached
    try {
      // eslint-disable-next-line no-console
      console.log("DIAG: snapshot after timeout =>", window.getBattleStateSnapshot?.());
      // eslint-disable-next-line no-console
      console.log("DIAG: dump waiters =>", window.dumpStateWaiters?.());
    } catch (e) {}
    // Wait until cooldown is reached
    await window.awaitBattleState?.("cooldown", 5000);

    // CooldownEnter should emit countdownStart and then auto-dispatch ready via fallback timer.
    // With the 1s floor, computeNextRoundCooldown() = 1 → auto-advance after ~1s to roundStart.
    await new Promise((r) => setTimeout(r, 1250));
    const snapshot = window.getBattleStateSnapshot?.();
    expect(["roundStart", "waitingForPlayerAction"]).toContain(snapshot?.state);
  });
});
