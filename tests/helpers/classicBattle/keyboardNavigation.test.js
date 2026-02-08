import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";

// Reuse the same mocks as view.initHelpers tests to capture event handlers
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => {
  const handlers = {};
  return {
    onBattleEvent: vi.fn((name, cb) => {
      handlers[name] = cb;
    }),
    emitBattleEvent: vi.fn(),
    handlers
  };
});

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
  return {
    ...actual,
    // Provide a controllable initStatButtons that returns mocked enable/disable
    initStatButtons: vi.fn(() => ({ enable: vi.fn(), disable: vi.fn() })),
    watchBattleOrientation: vi.fn(),
    setupNextButton: vi.fn(),
    applyStatLabels: vi.fn(() => Promise.resolve()),
    initTooltips: vi.fn(() => Promise.resolve()),
    maybeShowStatHint: vi.fn()
  };
});

const setupUIBindings = await import("../../../src/helpers/classicBattle/setupUIBindings.js");

function makeView() {
  return {
    controller: {
      battleStore: {},
      timerControls: { pauseTimer: vi.fn(), resumeTimer: vi.fn() }
    },
    startRound: vi.fn(),
    applyBattleOrientation: vi.fn()
  };
}

describe("Keyboard navigation - focus management", () => {
  let container;

  beforeEach(() => {
    // Setup a minimal DOM for stat buttons
    document.body.innerHTML = `
      <div id="stat-buttons">
        <button data-stat="speed">Speed</button>
        <button data-stat="power">Power</button>
        <button data-stat="technique">Technique</button>
      </div>
    `;
    container = document.getElementById("stat-buttons");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("focuses the first stat button when statButtons:enable is emitted", async () => {
    const view = makeView();

    // Call setupUIBindings which will register the event handlers
    const setup = (await setupUIBindings).default || (await setupUIBindings).setupUIBindings;
    await setup(view);

    // Retrieve the registered handler and invoke it
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const handler = events.handlers["statButtons:enable"];
    expect(typeof handler).toBe("function");

    // Fire the handler
    handler();

    // The first button should now be focused
    const first = container.querySelector("button[data-stat]");
    expect(document.activeElement).toBe(first);
  });
});
