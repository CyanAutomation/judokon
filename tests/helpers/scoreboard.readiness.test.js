import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, clearBody } from "./domUtils.js";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

describe("scoreboard readiness badge reflection", () => {
  let originalMutationObserver;
  /** @type {MutationObserverCallback | undefined} */
  let invokeObserver;
  /** @type {Element | undefined} */
  let observedTarget;
  /** @type {MutationObserverInit | undefined} */
  let observedOptions;

  beforeEach(() => {
    vi.resetModules();
    originalMutationObserver = globalThis.MutationObserver;
    invokeObserver = undefined;
    observedTarget = undefined;
    observedOptions = undefined;
    globalThis.MutationObserver = class {
      constructor(callback) {
        invokeObserver = callback;
      }
      observe(target, options) {
        observedTarget = target;
        observedOptions = options;
        return undefined;
      }
      disconnect() {
        return undefined;
      }
      takeRecords() {
        return [];
      }
    };
  });

  afterEach(() => {
    clearBody();
    if (originalMutationObserver) {
      globalThis.MutationObserver = originalMutationObserver;
    } else {
      delete globalThis.MutationObserver;
    }
  });

  async function renderScoreboard() {
    const { container } = mount();
    const header = document.createElement("header");
    header.className = "header battle-header";
    const left = document.createElement("div");
    left.className = "scoreboard-left";
    left.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
    `;
    const right = document.createElement("div");
    right.className = "scoreboard-right";
    right.innerHTML = `
      <p id="score-display" aria-live="polite" aria-atomic="true">
        <span data-side="player">
          <span data-part="label">You:</span>
          <span data-part="value">0</span>
        </span>
        <span data-side="opponent">
          <span data-part="label">Opponent:</span>
          <span data-part="value">0</span>
        </span>
      </p>
      <span id="next-ready-badge" aria-hidden="true" hidden></span>
    `;
    const controls = document.createElement("div");
    controls.innerHTML = `
      <button id="next-button" disabled>Next</button>
    `;
    header.append(left, controls, right);
    container.appendChild(header);

    const scheduler = await import("./mockScheduler.js");
    const { setupScoreboard } = await import("../../src/helpers/setupScoreboard.js");
    const controlsApi = { startCoolDown: vi.fn(), pauseTimer: vi.fn(), resumeTimer: vi.fn() };
    setupScoreboard(controlsApi, scheduler.createMockScheduler());
    const nextButton = container.querySelector("#next-button");
    const badge = container.querySelector("#next-ready-badge");
    if (!(nextButton instanceof HTMLElement) || !(badge instanceof HTMLElement)) {
      throw new Error("Scoreboard DOM did not render expected controls");
    }
    return { nextButton, badge };
  }

  it("observes the Next button for readiness changes", async () => {
    const { nextButton } = await renderScoreboard();

    expect(typeof invokeObserver).toBe("function");
    expect(observedTarget).toBe(nextButton);
    expect(observedOptions).toEqual({
      attributes: true,
      attributeFilter: ["disabled", "data-next-ready", "aria-busy"]
    });
  });

  it("toggles #next-ready-badge hidden based on next button readiness", async () => {
    const { nextButton, badge } = await renderScoreboard();
    // Initially disabled => badge hidden
    expect(nextButton.disabled).toBe(true);
    expect(badge.hidden).toBe(true);
    // Enable next button => badge visible
    nextButton.disabled = false;
    invokeObserver?.([]);
    expect(badge.hidden).toBe(false);
    // Disable again => badge hidden
    nextButton.disabled = true;
    invokeObserver?.([]);
    expect(badge.hidden).toBe(true);
  });
});
