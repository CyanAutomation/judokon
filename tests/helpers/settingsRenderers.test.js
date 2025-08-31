import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSettingsDom, resetDom } from "../utils/testUtils.js";

beforeEach(() => {
  resetDom();
  document.body.appendChild(createSettingsDom());
});

describe("syncDisplayMode", () => {
  it("applies selected mode without touching other sections", async () => {
    vi.mock("../../src/helpers/displayMode.js", () => ({
      applyDisplayMode: vi.fn()
    }));
    vi.mock("../../src/helpers/viewTransition.js", () => ({
      withViewTransition: vi.fn((fn) => fn())
    }));
    const { syncDisplayMode } = await import("../../src/helpers/settings/syncDisplayMode.js");
    document.getElementById("display-mode-dark").checked = true;
    const handleUpdate = vi.fn().mockResolvedValue();
    const updated = syncDisplayMode({ displayMode: "light" }, handleUpdate);
    expect(updated.displayMode).toBe("dark");
    expect(handleUpdate).toHaveBeenCalledWith("displayMode", "dark", expect.any(Function));
    const { applyDisplayMode } = await import("../../src/helpers/displayMode.js");
    expect(applyDisplayMode).toHaveBeenCalledWith("dark");
    expect(document.querySelectorAll("#game-mode-toggle-container .settings-item")).toHaveLength(0);
    expect(document.querySelectorAll("#feature-flags-container .settings-item")).toHaveLength(0);
  });
});

describe("renderGameModes", () => {
  it("updates only the game mode container", async () => {
    vi.mock("../../src/helpers/settings/gameModeSwitches.js", () => ({
      renderGameModeSwitches: vi.fn((container) => {
        const item = document.createElement("div");
        item.className = "settings-item";
        container.appendChild(item);
      })
    }));
    const { renderGameModes } = await import("../../src/helpers/settings/renderGameModes.js");
    renderGameModes([{ id: 1 }], () => ({}), vi.fn());
    const { renderGameModeSwitches } = await import(
      "../../src/helpers/settings/gameModeSwitches.js"
    );
    expect(renderGameModeSwitches).toHaveBeenCalled();
    expect(document.querySelectorAll("#game-mode-toggle-container .settings-item")).toHaveLength(1);
    expect(document.querySelectorAll("#feature-flags-container .settings-item")).toHaveLength(0);
  });
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
    renderFeatureFlags({ featureFlags: {} }, () => ({}), vi.fn(), {});
    const { syncFeatureFlags } = await import("../../src/helpers/settings/syncFeatureFlags.js");
    const { renderFeatureFlagSwitches } = await import(
      "../../src/helpers/settings/featureFlagSwitches.js"
    );
    expect(syncFeatureFlags).toHaveBeenCalled();
    expect(renderFeatureFlagSwitches).toHaveBeenCalled();
    expect(document.querySelectorAll("#feature-flags-container .settings-item")).toHaveLength(1);
    expect(document.querySelectorAll("#game-mode-toggle-container .settings-item")).toHaveLength(0);
  });
});

describe("renderNavCacheReset", () => {
  it("renders button and rebinds on toggle change", async () => {
    const toggle = document.createElement("input");
    toggle.id = "feature-nav-cache-reset-button";
    document.body.appendChild(toggle);
    vi.mock("../../src/helpers/settings/addNavResetButton.js", () => ({
      addNavResetButton: vi.fn(() => {
        const btn = document.createElement("button");
        btn.id = "nav-cache-reset-button";
        document.getElementById("feature-flags-container").appendChild(btn);
      })
    }));
    const { renderNavCacheReset } = await import(
      "../../src/helpers/settings/renderNavCacheReset.js"
    );
    renderNavCacheReset();
    const { addNavResetButton } = await import("../../src/helpers/settings/addNavResetButton.js");
    expect(addNavResetButton).toHaveBeenCalledTimes(1);
    expect(document.getElementById("nav-cache-reset-button")).toBeTruthy();
    toggle.dispatchEvent(new Event("change"));
    expect(addNavResetButton).toHaveBeenCalledTimes(2);
  });
});
