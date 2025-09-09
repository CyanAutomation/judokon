import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { waitFor } from "../waitFor.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI points to win start", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    await cleanupBattleCLI();
  });

  it("starts countdown after changing points to win and clicking start once", async () => {
    const mod = await loadBattleCLI();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    const { initClassicBattleOrchestrator } = await import(
      "../../src/helpers/classicBattle/orchestrator.js"
    );
    let machine;
    let initCount = 0;
    initClassicBattleOrchestrator.mockImplementation(() => {
      initCount++;
      return new Promise((resolve) => {
        setTimeout(() => {
          machine = {
            allowStart: initCount > 1,
            dispatch: vi.fn((evt) => {
              if (evt === "startClicked") {
                if (machine.allowStart) {
                  emitBattleEvent("battleStateChange", {
                    to: "waitingForPlayerAction"
                  });
                } else {
                  machine.allowStart = true;
                }
              }
            })
          };
          debugHooks.exposeDebugState("getClassicBattleMachine", () => machine);
          resolve();
        }, 0);
      });
    });
    await mod.init();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const select = document.getElementById("points-select");
    select.value = "10";
    select.dispatchEvent(new Event("change"));
    const btn = await new Promise((resolve) => {
      const existing = document.getElementById("start-match-button");
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const el = document.getElementById("start-match-button");
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    expect(btn).toBeTruthy();
    btn.click();
    await waitFor(() =>
      emitBattleEvent.mock.calls.some(
        (c) => c[0] === "battleStateChange" && c[1]?.to === "waitingForPlayerAction"
      )
    );
    confirmSpy.mockRestore();
  });
});
