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
    const updated = await withMutedConsole(() =>
      syncDisplayMode({ displayMode: "light" }, handleUpdate)
    );
    expect(updated.displayMode).toBe("dark");
    expect(handleUpdate).toHaveBeenCalledWith("displayMode", "dark", expect.any(Function));
    const { applyDisplayMode } = await import("../../src/helpers/displayMode.js");
    expect(applyDisplayMode).toHaveBeenCalledWith("dark");
    expect(document.querySelectorAll("#game-mode-toggle-container .settings-item")).toHaveLength(0);
    expect(document.querySelectorAll("#feature-flags-container .settings-item")).toHaveLength(0);
  });

  it("returns current settings when no radio is checked", async () => {
    vi.mock("../../src/helpers/displayMode.js", () => ({
      applyDisplayMode: vi.fn()
    }));
    vi.mock("../../src/helpers/viewTransition.js", () => ({
      withViewTransition: vi.fn((fn) => fn())
    }));
    const { syncDisplayMode } = await import("../../src/helpers/settings/syncDisplayMode.js");
    const handleUpdate = vi.fn();
    const current = { displayMode: "light" };
    const updated = await withMutedConsole(() => syncDisplayMode(current, handleUpdate));
    expect(updated).toEqual(current);
    expect(handleUpdate).not.toHaveBeenCalled();
    const { applyDisplayMode } = await import("../../src/helpers/displayMode.js");
    expect(applyDisplayMode).not.toHaveBeenCalled();
  });
});
