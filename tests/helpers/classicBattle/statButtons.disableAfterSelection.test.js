import { beforeEach, describe, expect, it, vi } from "vitest";

// Bind battle event helpers
import { emitBattleEvent, __resetBattleEventTarget } from "../../../src/helpers/classicBattle/battleEvents.js";

describe("Classic Battle - disable stat buttons after selection", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
    document.body.innerHTML = `
      <div id="stat-buttons">
        <button data-stat="power" data-testid="stat-button">Power</button>
        <button data-stat="speed" data-testid="stat-button">Speed</button>
        <button data-stat="technique" data-testid="stat-button">Technique</button>
      </div>
    `;
  });

  it("disables sibling stat buttons and prevents re-selection", async () => {
    // Arrange: bind round UI handlers that respond to statSelected by disabling
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindStatSelected?.();

    const buttons = Array.from(document.querySelectorAll('#stat-buttons button[data-stat]'));
    // Enable via event to simulate ready state
    const setup = await import("../../../src/helpers/classicBattle/setupUIBindings.js");
    const view = { controller: { battleStore: {} } };
    const controls = await setup.setupUIBindings(view);
    // Ensure enable handler ran
    emitBattleEvent("statButtons:enable");
    expect(buttons.every((b) => !b.disabled && b.tabIndex === 0)).toBe(true);

    // Act: select first stat
    const store = { statButtonEls: Object.fromEntries(buttons.map((b) => [b.dataset.stat, b])) };
    emitBattleEvent("statSelected", { stat: "power", store });

    // Assert: siblings disabled and removed from tab order
    const [first, ...rest] = buttons;
    expect(first.classList.contains("selected")).toBe(true);
    expect(rest.every((b) => b.disabled && b.tabIndex === -1)).toBe(true);

    // Attempt to re-emit selection for a different stat should not re-enable or change selection
    emitBattleEvent("statSelected", { stat: "speed", store });
    expect(first.classList.contains("selected")).toBe(true);
    expect(rest.every((b) => b.disabled)).toBe(true);

    // Cleanup
    controls?.disable?.();
  });
});

