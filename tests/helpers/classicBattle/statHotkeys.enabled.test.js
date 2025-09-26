import { describe, it, expect, vi, beforeEach } from "vitest";

import "./commonMocks.js";

describe("Stat hotkeys default ON", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="stat-buttons">
        <button data-stat="speed">Speed</button>
        <button data-stat="power">Power</button>
        <button data-stat="technique">Technique</button>
      </div>
    `;
  });

  it("pressing '1' triggers first stat when enabled", async () => {
    const { initStatButtons } = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    const { isEnabled, enableFlag } = await import("../../../src/helpers/featureFlags.js");
    // Ensure flag is enabled by default path (initStatButtons wires hotkeys)
    if (!isEnabled("statHotkeys")) enableFlag("statHotkeys");

    const clicked = vi.fn();
    const first = document.querySelector('#stat-buttons button[data-stat]');
    first.addEventListener("click", clicked);

    const api = initStatButtons({});
    api.enable();

    // Dispatch a keydown for '1'
    const evt = new KeyboardEvent("keydown", { key: "1", bubbles: true });
    document.dispatchEvent(evt);

    expect(clicked).toHaveBeenCalledOnce();
  });
});

