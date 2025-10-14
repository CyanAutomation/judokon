import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

describe("debug DOM class toggles", () => {
  it("applies the tooltip overlay class when enabled", () => {
    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(false);
    expect(getDebugState().tooltipOverlayDebug).toBe(false);

    toggleTooltipOverlayDebug(true);

    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(true);
    expect(getDebugState().tooltipOverlayDebug).toBe(true);
    expect(document.body.getAttribute("data-feature-tooltip-overlay-debug")).toBe("enabled");

    toggleTooltipOverlayDebug(false);

    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(false);
    expect(getDebugState().tooltipOverlayDebug).toBe(false);
    expect(document.body.getAttribute("data-feature-tooltip-overlay-debug")).toBe("disabled");
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
        tooltipOverlayDebug: { enabled: false }
      }
    };

    const handleUpdate = vi.fn().mockImplementation((_key, value) => {
      settings.featureFlags = value;
      return Promise.resolve();
    });

    renderFeatureFlagSwitches(
      container,
      {
        tooltipOverlayDebug: { enabled: false }
      },
      () => settings,
      handleUpdate,
      {}
    );

    const overlayToggle = container.querySelector("#feature-tooltip-overlay-debug");

    expect(overlayToggle).toBeTruthy();

    if (!(overlayToggle instanceof HTMLInputElement)) {
      throw new Error("Expected tooltip overlay toggle input");
    }

    expect(getDebugState().tooltipOverlayDebug).toBe(false);

    overlayToggle.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(true);
    expect(document.body.getAttribute("data-feature-tooltip-overlay-debug")).toBe("enabled");
    const state = getDebugState();
    expect(state.tooltipOverlayDebug).toBe(true);
    expect(settings.featureFlags).toEqual({
      tooltipOverlayDebug: { enabled: true }
    });
    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(
      handleUpdate.mock.calls.map(([key, value]) => ({
        key,
        tooltip: value.tooltipOverlayDebug?.enabled
      }))
    ).toEqual([{ key: "featureFlags", tooltip: true }]);

    overlayToggle.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(false);
    expect(document.body.getAttribute("data-feature-tooltip-overlay-debug")).toBe("disabled");
    const resetState = getDebugState();
    expect(resetState.tooltipOverlayDebug).toBe(false);
    expect(settings.featureFlags).toEqual({
      tooltipOverlayDebug: { enabled: false }
    });
    expect(handleUpdate).toHaveBeenCalledTimes(2);
    expect(
      handleUpdate.mock.calls.map(([key, value]) => ({
        key,
        tooltip: value.tooltipOverlayDebug?.enabled
      }))
    ).toEqual([
      { key: "featureFlags", tooltip: true },
      { key: "featureFlags", tooltip: false }
    ]);
  });

  it("omits hidden feature flag toggles from settings UI", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const settings = { featureFlags: {} };
    const handleUpdate = vi.fn();

    renderFeatureFlagSwitches(
      container,
      {
        roundStore: { enabled: true, hidden: true }
      },
      () => settings,
      handleUpdate,
      {}
    );

    expect(container.querySelector("[data-flag='roundStore']")).toBeNull();
    expect(handleUpdate).not.toHaveBeenCalled();
    container.remove();
  });
});
