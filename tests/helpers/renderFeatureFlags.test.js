import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSettingsDom, resetDom } from "../utils/testUtils.js";
import { withMutedConsole } from "../utils/console.js";

beforeEach(() => {
  resetDom();
  document.body.appendChild(createSettingsDom());
});

afterEach(() => {
  resetDom();
});

describe("renderFeatureFlags", () => {
  it("updates only the feature flag container", async () => {
    vi.mock("../../src/helpers/settings/featureFlagSwitches.js", () => ({
      renderFeatureFlagSwitches: vi.fn((container, flags) => {
        Object.keys(flags).forEach(() => {
          const item = document.createElement("div");
          item.className = "settings-item";
          container.appendChild(item);
        });
      })
    }));
    vi.mock("../../src/helpers/settings/syncFeatureFlags.js", () => ({
      syncFeatureFlags: vi.fn(() => ({ testFlag: { enabled: true } }))
    }));
    const { renderFeatureFlags } = await import("../../src/helpers/settings/renderFeatureFlags.js");
    await withMutedConsole(() => renderFeatureFlags({ featureFlags: {} }, () => ({}), vi.fn(), {}));
    const { syncFeatureFlags } = await import("../../src/helpers/settings/syncFeatureFlags.js");
    const { renderFeatureFlagSwitches } = await import(
      "../../src/helpers/settings/featureFlagSwitches.js"
    );
    expect(syncFeatureFlags).toHaveBeenCalled();
    expect(renderFeatureFlagSwitches).toHaveBeenCalled();
  });

  it("handles empty feature flags", async () => {
    vi.mock("../../src/helpers/settings/featureFlagSwitches.js", () => ({
      renderFeatureFlagSwitches: vi.fn()
    }));
    vi.mock("../../src/helpers/settings/syncFeatureFlags.js", () => ({
      syncFeatureFlags: vi.fn(() => ({}))
    }));
    const { renderFeatureFlags } = await import("../../src/helpers/settings/renderFeatureFlags.js");
    await withMutedConsole(() => renderFeatureFlags({ featureFlags: {} }, () => ({}), vi.fn(), {}));
    const { renderFeatureFlagSwitches } = await import(
      "../../src/helpers/settings/featureFlagSwitches.js"
    );
    expect(renderFeatureFlagSwitches).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      {},
      expect.any(Function),
      expect.any(Function),
      {}
    );
  });
});
