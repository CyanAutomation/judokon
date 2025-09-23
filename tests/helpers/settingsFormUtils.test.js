import { describe, it, expect } from "vitest";
import {
  renderGameModeSwitches,
  renderFeatureFlagSwitches
} from "../../src/helpers/settingsFormUtils.js";

describe("formUtils ARIA", () => {
  it("adds aria-describedby for game mode descriptions", () => {
    const container = document.createElement("div");
    const modes = [{ id: 1, name: "Classic", category: "main", order: 1, description: "desc" }];
    renderGameModeSwitches(
      container,
      modes,
      () => ({ gameModes: {} }),
      () => {}
    );
    const input = container.querySelector("#mode-1");
    const desc = container.querySelector("#mode-1-desc");
    expect(desc).toBeTruthy();
    expect(input).toHaveAttribute("aria-describedby", "mode-1-desc");
  });

  it("adds aria-describedby for feature flag descriptions", () => {
    const container = document.createElement("div");
    const flags = {
      testFlag: { label: "Test", description: "flag desc" }
    };
    renderFeatureFlagSwitches(
      container,
      flags,
      () => ({ featureFlags: {} }),
      () => {}
    );
    const input = container.querySelector("#feature-test-flag");
    const desc = container.querySelector("#feature-test-flag-desc");
    expect(desc).toBeTruthy();
    expect(input).toHaveAttribute("aria-describedby", "feature-test-flag-desc");
  });

  it("adds data-tooltip-id for game mode switches", () => {
    const container = document.createElement("div");
    const modes = [{ id: 1, name: "Classic Battle", order: 1 }];
    renderGameModeSwitches(
      container,
      modes,
      () => ({ gameModes: {} }),
      () => {}
    );
    const input = container.querySelector("#mode-1");
    expect(input).toHaveAttribute("data-tooltip-id", "mode.1");
  });

  it("skips modes without navigation entries", () => {
    const container = document.createElement("div");
    const modes = [
      { id: 1, name: "Classic", order: 1 },
      { id: 999, name: "Unsupported", order: 2 }
    ];
    renderGameModeSwitches(
      container,
      modes,
      () => ({ gameModes: {} }),
      () => {}
    );
    expect(container.querySelector("#mode-1")).toBeTruthy();
    expect(container.querySelector("#mode-999")).toBeNull();
  });
});

describe("renderFeatureFlagSwitches", () => {
  it("uses default tooltip id when none provided", () => {
    const container = document.createElement("div");
    const flags = {
      firstFlag: { enabled: true },
      secondFlag: { enabled: true, tooltipId: "custom.tip" }
    };
    renderFeatureFlagSwitches(
      container,
      flags,
      () => ({ featureFlags: {} }),
      () => {}
    );
    const first = container.querySelector("#feature-first-flag");
    const second = container.querySelector("#feature-second-flag");
    expect(first).toHaveAttribute("data-tooltip-id", "settings.firstFlag");
    expect(second).toHaveAttribute("data-tooltip-id", "custom.tip");
  });
});
