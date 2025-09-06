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
    await withMutedConsole(() => renderGameModes([{ id: 1 }], () => ({}), vi.fn()));
    const { renderGameModeSwitches } = await import(
      "../../src/helpers/settings/gameModeSwitches.js"
    );
    expect(renderGameModeSwitches).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      [{ id: 1 }],
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("handles no game modes", async () => {
    vi.mock("../../src/helpers/settings/gameModeSwitches.js", () => ({
      renderGameModeSwitches: vi.fn()
    }));
    const { renderGameModes } = await import("../../src/helpers/settings/renderGameModes.js");
    await withMutedConsole(() => renderGameModes([], () => ({}), vi.fn()));
    const { renderGameModeSwitches } = await import(
      "../../src/helpers/settings/gameModeSwitches.js"
    );
    expect(renderGameModeSwitches).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      [],
      expect.any(Function),
      expect.any(Function)
    );
  });
});
