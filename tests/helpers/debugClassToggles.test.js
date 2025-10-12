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

describe("debug state recording", () => {
  // The DOM class toggling helpers are exercised indirectly via the settings UI test below.
  it("records state for toggleTooltipOverlayDebug", () => {
    expect(getDebugState().tooltipOverlayDebug).toBe(false);

    toggleTooltipOverlayDebug(true);
    expect(getDebugState().tooltipOverlayDebug).toBe(true);

    toggleTooltipOverlayDebug(false);
    expect(getDebugState().tooltipOverlayDebug).toBe(false);
  });

  it("records state for toggleViewportSimulation", () => {
    expect(getDebugState().viewportSimulation).toBe(false);

    toggleViewportSimulation(true);
    expect(getDebugState().viewportSimulation).toBe(true);

    toggleViewportSimulation(false);
    expect(getDebugState().viewportSimulation).toBe(false);
  });
});

describe("debug DOM class toggles", () => {
  it.each([
    {
      name: "tooltip overlay",
      toggle: toggleTooltipOverlayDebug,
      className: "tooltip-overlay-debug",
      stateKey: "tooltipOverlayDebug"
    },
    {
      name: "viewport simulation",
      toggle: toggleViewportSimulation,
      className: "simulate-viewport",
      stateKey: "viewportSimulation"
    }
  ])("applies the %s class when enabled", ({ toggle, className, stateKey }) => {
    expect(document.body.classList.contains(className)).toBe(false);
    expect(getDebugState()[stateKey]).toBe(false);

    toggle(true);

    expect(document.body.classList.contains(className)).toBe(true);
    expect(getDebugState()[stateKey]).toBe(true);

    toggle(false);

    expect(document.body.classList.contains(className)).toBe(false);
    expect(getDebugState()[stateKey]).toBe(false);
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

  it("applies debug classes and persists settings when toggles change", async () => {
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

    overlayToggle.click();
    viewportToggle.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(true);
    expect(document.body.classList.contains("simulate-viewport")).toBe(true);
    const state = getDebugState();
    expect(state.tooltipOverlayDebug).toBe(true);
    expect(state.viewportSimulation).toBe(true);
    expect(settings.featureFlags).toEqual({
      tooltipOverlayDebug: { enabled: true },
      viewportSimulation: { enabled: true }
    });
    expect(handleUpdate).toHaveBeenCalledTimes(2);
    expect(
      handleUpdate.mock.calls.map(([key, value]) => ({
        key,
        tooltip: value.tooltipOverlayDebug?.enabled,
        viewport: value.viewportSimulation?.enabled
      }))
    ).toEqual([
      { key: "featureFlags", tooltip: true, viewport: false },
      { key: "featureFlags", tooltip: true, viewport: true }
    ]);
  });
});
