import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import "./commonMocks.js";

describe("Stat hotkeys default ON", () => {
  let originalOverrides;

  beforeEach(() => {
    originalOverrides = globalThis.window?.__FF_OVERRIDES;
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = {};
    }
    document.body.innerHTML = `
      <div id="stat-buttons">
        <button data-stat="speed">Speed</button>
        <button data-stat="power">Power</button>
        <button data-stat="technique">Technique</button>
      </div>
    `;
  });

  afterEach(() => {
    if (typeof window !== "undefined") {
      if (originalOverrides === undefined) {
        delete window.__FF_OVERRIDES;
      } else {
        window.__FF_OVERRIDES = originalOverrides;
      }
    }
    document.body.innerHTML = "";
  });

  it("pressing '1' triggers first stat when enabled", async () => {
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES.statHotkeys = true;
    }
    const { initStatButtons } = await import("../../../src/helpers/classicBattle/uiHelpers.js");

    const clicked = vi.fn();
    const first = document.querySelector("#stat-buttons button[data-stat]");
    first.addEventListener("click", clicked);

    const api = initStatButtons({});
    api.enable();

    // Dispatch a keydown for '1'
    const evt = new KeyboardEvent("keydown", { key: "1", bubbles: true });
    document.dispatchEvent(evt);

    expect(clicked).toHaveBeenCalledOnce();
  });

  it("does not trigger when flag disabled", async () => {
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES.statHotkeys = false;
    }
    const { initStatButtons } = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    const clicked = vi.fn();
    const first = document.querySelector("#stat-buttons button[data-stat]");
    first.addEventListener("click", clicked);

    const api = initStatButtons({});
    api.enable();

    const evt = new KeyboardEvent("keydown", { key: "1", bubbles: true });
    document.dispatchEvent(evt);

    expect(clicked).not.toHaveBeenCalled();
  });
});
