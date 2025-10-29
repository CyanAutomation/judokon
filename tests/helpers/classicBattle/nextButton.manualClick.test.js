import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";
import { __setStateSnapshot } from "../../../src/helpers/classicBattle/battleDebug.js";

const getEnv = setupClassicBattleHooks();

function ensureNextButton() {
  let nextButton = document.getElementById("next-button");
  if (!nextButton) {
    nextButton = document.createElement("button");
    nextButton.id = "next-button";
    document.body.appendChild(nextButton);
  }
  nextButton.setAttribute("data-role", "next-round");
  nextButton.disabled = true;
  return nextButton;
}

describe("Next button manual click", () => {
  let env;

  beforeEach(() => {
    env = getEnv();
    document.getElementById("next-button")?.remove();
  });

  afterEach(() => {
    __setStateSnapshot({});
    document.getElementById("next-button")?.remove();
  });

  it("resolves cooldown controls and clears readiness affordances after manual click", async () => {
    const nextButton = ensureNextButton();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const roundManager = await import("../../../src/helpers/classicBattle/roundManager.js");
    const timerService = await import("../../../src/helpers/classicBattle/timerService.js");
    const readinessChanges = [];
    const disabledChanges = [];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "data-next-ready") {
          readinessChanges.push(nextButton.getAttribute("data-next-ready"));
        }
        if (mutation.attributeName === "disabled") {
          disabledChanges.push(nextButton.hasAttribute("disabled"));
        }
      }
    });
    observer.observe(nextButton, {
      attributes: true,
      attributeFilter: ["data-next-ready", "disabled"],
      attributeOldValue: true
    });
    const { markNextReady } = await import(
      "../../../src/helpers/classicBattle/cooldownOrchestrator.js"
    );

    const store = roundManager.createBattleStore();
    const controls = roundManager.startCooldown(store);
    const readyPromise = controls.ready;

    markNextReady(nextButton);
    expect(nextButton.disabled).toBe(false);
    expect(nextButton.dataset.nextReady).toBe("true");
    expect(nextButton.getAttribute("data-next-ready")).toBe("true");
    expect(document.querySelectorAll('[data-role="next-round"]').length).toBe(1);

    __setStateSnapshot({ state: "cooldown" });

    await timerService.onNextButtonClick(new MouseEvent("click"), controls);

    await readyPromise;

    observer.disconnect();
    expect(readinessChanges).toContain(null);
    expect(disabledChanges).toContain(true);
    expect(controls.readyDispatched).toBe(true);
    expect(controls.resolveReady).toBeNull();
    expect(controls.readyInFlight).toBe(false);

    expect(nextButton.dataset.nextReady).toBe("true");
    expect(nextButton.getAttribute("data-next-ready")).toBe("true");

    if (typeof env.timerSpy?.runAllTimersAsync === "function") {
      await env.timerSpy.runAllTimersAsync();
    }
    await vi.runAllTimersAsync();
  });
});
