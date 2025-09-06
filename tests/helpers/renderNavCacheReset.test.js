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
    await withMutedConsole(() => renderNavCacheReset());
    const { addNavResetButton } = await import("../../src/helpers/settings/addNavResetButton.js");
    expect(addNavResetButton).toHaveBeenCalledTimes(1);
    toggle.dispatchEvent(new Event("change"));
    expect(addNavResetButton).toHaveBeenCalledTimes(2);
  });

  it("does nothing when toggle is missing", async () => {
    vi.mock("../../src/helpers/settings/addNavResetButton.js", () => ({
      addNavResetButton: vi.fn()
    }));
    const { renderNavCacheReset } = await import(
      "../../src/helpers/settings/renderNavCacheReset.js"
    );
    await withMutedConsole(() => renderNavCacheReset());
    const { addNavResetButton } = await import("../../src/helpers/settings/addNavResetButton.js");
    expect(addNavResetButton).toHaveBeenCalledTimes(1);
  });
});
