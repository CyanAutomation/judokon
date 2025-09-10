import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

const seedHtml =
  '<div style="display:flex;flex-direction:column"><input id="seed-input" type="number" />' +
  '<div id="seed-error"></div></div>';

describe("battleCLI seed validation", () => {
  beforeEach(() => {
    const machine = { dispatch: vi.fn() };
    debugHooks.exposeDebugState(
      "getClassicBattleMachine",
      vi.fn(() => machine)
    );
    window.__TEST_MACHINE__ = machine;
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(async () => {
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    delete window.__TEST_MACHINE__;
    await cleanupBattleCLI();
  });

  it("accepts numeric seed", async () => {
    const mod = await loadBattleCLI({ html: seedHtml });
    await mod.init();
    const input = document.getElementById("seed-input");
    input.value = "9";
    input.dispatchEvent(new Event("change"));
    expect(localStorage.getItem("battleCLI.seed")).toBe("9");
    expect(document.getElementById("seed-error").textContent).toBe("");
  });

  it("shows error and clears for NaN", async () => {
    const mod = await loadBattleCLI({
      url: "http://localhost/battleCLI.html?seed=3",
      html: seedHtml
    });
    await mod.init();
    const input = document.getElementById("seed-input");
    input.value = "abc";
    input.dispatchEvent(new Event("change"));
    expect(input.value).toBe("");
    expect(document.getElementById("seed-error").textContent).toBe("Invalid seed. Using default.");
    expect(localStorage.getItem("battleCLI.seed")).toBeNull();
    expect(window.__testMode).toBe(false);
  });

  it("clears error after recovery", async () => {
    const mod = await loadBattleCLI({
      url: "http://localhost/battleCLI.html?seed=3",
      html: seedHtml
    });
    await mod.init();
    const input = document.getElementById("seed-input");
    input.value = "abc";
    input.dispatchEvent(new Event("change"));
    expect(window.__testMode).toBe(false);
    input.value = "4";
    input.dispatchEvent(new Event("change"));
    expect(document.getElementById("seed-error").textContent).toBe("");
    expect(input.value).toBe("4");
    expect(localStorage.getItem("battleCLI.seed")).toBe("4");
    expect(window.__testMode).toBe(true);
  });
});
