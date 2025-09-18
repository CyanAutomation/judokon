import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toggleViewportSimulation } from "../../src/helpers/viewportDebug.js";
import { toggleTooltipOverlayDebug } from "../../src/helpers/tooltipOverlayDebug.js";
import { renderFeatureFlagSwitches } from "../../src/helpers/settings/featureFlagSwitches.js";
import { getDebugState, resetDebugState } from "../../src/helpers/debugState.js";

beforeEach(() => {
  document.body.className = "";
  document.body.innerHTML = "";
  resetDebugState();
});

afterEach(() => {
  resetDebugState();
});

describe.each([
  ["toggleViewportSimulation", toggleViewportSimulation, "simulate-viewport"],
  ["toggleTooltipOverlayDebug", toggleTooltipOverlayDebug, "tooltip-overlay-debug"]
])("%s", (_name, fn, className) => {
  it("adds and removes the class based on argument", () => {
    fn(true);
    expect(document.body.classList.contains(className)).toBe(true);
    fn(false);
    expect(document.body.classList.contains(className)).toBe(false);
  });
});

describe("toggleTooltipOverlayDebug", () => {
  it("records fallback state when document is undefined", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const originalDocument = global.document;
    // @ts-ignore - simulate an environment without document
    delete global.document;

    toggleTooltipOverlayDebug(true);

    expect(infoSpy).toHaveBeenCalledWith(
      "[tooltipOverlayDebug] Document unavailable; recorded desired state:",
      true
    );
    expect(getDebugState().tooltipOverlayDebug).toBe(true);

    global.document = originalDocument;
    infoSpy.mockRestore();
  });
});

describe("toggleViewportSimulation", () => {
  it("records fallback state when document is undefined", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const originalDocument = global.document;
    // @ts-ignore - simulate an environment without document
    delete global.document;

    toggleViewportSimulation(true);

    expect(infoSpy).toHaveBeenCalledWith(
      "[viewportSimulation] Document unavailable; recorded desired state:",
      true
    );
    expect(getDebugState().viewportSimulation).toBe(true);

    global.document = originalDocument;
    infoSpy.mockRestore();
  });
});

describe("feature flag debug toggles integration", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.__disableSnackbars = true;
    }
  });

  afterEach(() => {
    if (typeof window !== "undefined") {
      delete window.__disableSnackbars;
    }
  });

  it("applies debug classes when toggles change", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const settings = {
      featureFlags: {
        tooltipOverlayDebug: { enabled: false },
        viewportSimulation: { enabled: false }
      }
    };

    const handleUpdate = vi.fn().mockImplementation((_key, value) => {
      settings.featureFlags = value;
      return Promise.resolve();
    });

    renderFeatureFlagSwitches(
      container,
      {
        tooltipOverlayDebug: { enabled: false },
        viewportSimulation: { enabled: false }
      },
      () => settings,
      handleUpdate,
      {}
    );

    const overlayToggle = container.querySelector("#feature-tooltip-overlay-debug");
    const viewportToggle = container.querySelector("#feature-viewport-simulation");

    expect(overlayToggle).toBeTruthy();
    expect(viewportToggle).toBeTruthy();

    if (!(overlayToggle instanceof HTMLInputElement)) {
      throw new Error("Expected tooltip overlay toggle input");
    }
    if (!(viewportToggle instanceof HTMLInputElement)) {
      throw new Error("Expected viewport simulation toggle input");
    }

    overlayToggle.checked = true;
    overlayToggle.dispatchEvent(new Event("change", { bubbles: true }));
    viewportToggle.checked = true;
    viewportToggle.dispatchEvent(new Event("change", { bubbles: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(true);
    expect(document.body.classList.contains("simulate-viewport")).toBe(true);
    const state = getDebugState();
    expect(state.tooltipOverlayDebug).toBe(true);
    expect(state.viewportSimulation).toBe(true);
    expect(handleUpdate).toHaveBeenCalledTimes(2);
  });
});
