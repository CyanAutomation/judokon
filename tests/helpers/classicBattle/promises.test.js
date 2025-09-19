import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { dispatchBattleEvent } from "../../../src/helpers/battleEvents.js";

// Mock the underlying event system
vi.mock("../../../src/helpers/battleEvents.js", () => ({
  onBattleEvent: vi.fn(),
  dispatchBattleEvent: vi.fn()
}));

// Dynamically import the module to be tested after mocks are in place
let promises;

describe("Battle Promises", () => {
  let onBattleEvent;

  beforeEach(async () => {
    // Reset mocks and window state before each test
    vi.resetModules();
    onBattleEvent = (await import("../../../src/helpers/battleEvents.js")).onBattleEvent;

    // Clear any global state on the window object
    Object.keys(window).forEach((key) => {
      if (key.includes("Promise") || key.startsWith("__")) {
        delete window[key];
      }
    });

    // Import the module under test
    promises = await import("../../../src/helpers/classicBattle/promises.js");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize all promises on module load", () => {
    expect(promises.roundPromptPromise).toBeInstanceOf(Promise);
    expect(promises.getRoundPromptPromise()).toBeInstanceOf(Promise);
    expect(onBattleEvent).toHaveBeenCalledWith("roundPrompt", expect.any(Function));
    expect(onBattleEvent).toHaveBeenCalledWith("roundResolved", expect.any(Function));
    expect(onBattleEvent).toHaveBeenCalledWith("nextRoundCountdownStarted", expect.any(Function));
  });

  it('getRoundPromptPromise resolves when the "roundPrompt" event is dispatched', async () => {
    let eventCallback;
    onBattleEvent.mockImplementation((eventName, callback) => {
      if (eventName === "roundPrompt") {
        eventCallback = callback;
      }
    });

    // Re-run initialization to capture the new mock implementation
    promises.resetBattlePromises();

    const promise = promises.getRoundPromptPromise();
    let hasResolved = false;
    promise.then(() => {
      hasResolved = true;
    });

    // Promise should be pending initially
    expect(hasResolved).toBe(false);

    // Simulate the event
    eventCallback();

    // Wait for the promise to resolve
    await promise;

    expect(hasResolved).toBe(true);
  });

  it("promise is replaced with a new one after resolution", async () => {
    let eventCallback;
    onBattleEvent.mockImplementation((eventName, callback) => {
      if (eventName === "roundResolved") {
        eventCallback = callback;
      }
    });
    promises.resetBattlePromises();

    const firstPromise = promises.getRoundResolvedPromise();
    eventCallback(); // Resolve the first promise
    await firstPromise;

    const secondPromise = promises.getRoundResolvedPromise();

    // The new promise should be a different instance and should be pending
    expect(secondPromise).not.toBe(firstPromise);
    const p = Promise.race([secondPromise, Promise.resolve("pending")]);
    expect(await p).toBe("pending");
  });

  it("resetBattlePromises creates new promise instances", async () => {
    const firstPromise = promises.getRoundPromptPromise();
    promises.resetBattlePromises();
    const secondPromise = promises.getRoundPromptPromise();
    expect(secondPromise).not.toBe(firstPromise);
  });

  it("getters return an already-resolved promise if the window.__resolved_ flag is set", async () => {
    const key = "roundTimeoutPromise";
    window[`__resolved_${key}`] = true;

    const promise = promises.getRoundTimeoutPromise();
    let hasResolved = false;
    promise.then(() => {
      hasResolved = true;
    });

    // Should resolve immediately without any event
    await promise;
    expect(hasResolved).toBe(true);
  });

  it("getters return the instance from the window object if available", () => {
    const key = "statSelectionStalledPromise";
    const fakePromise = Promise.resolve("fake");
    window[key] = fakePromise;

    const retrievedPromise = promises.getStatSelectionStalledPromise();
    expect(retrievedPromise).toBe(fakePromise);
  });
});
