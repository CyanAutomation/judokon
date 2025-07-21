import { describe, it, expect, vi } from "vitest";
import { createRandomCardDom } from "../utils/testUtils.js";

const baseSettings = {
  sound: false,
  fullNavMap: true,
  motionEffects: true,
  displayMode: "light",
  gameModes: {}
};

describe("randomJudokaPage module", () => {
  it("initializes controls and passes motion flag", async () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const generateRandomCard = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue([]);
    const createButton = vi.fn(() => document.createElement("button"));
    const createToggleSwitch = vi.fn((_, opts) => {
      const wrapper = document.createElement("div");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = opts.id;
      input.checked = opts.checked;
      wrapper.appendChild(input);
      return wrapper;
    });
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const applyMotionPreference = vi.fn();

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
    vi.doMock("../../src/components/Button.js", () => ({ createButton }));
    vi.doMock("../../src/components/ToggleSwitch.js", () => ({ createToggleSwitch }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings, updateSetting }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container } = createRandomCardDom();
    document.body.append(section, container);

    const { setupRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(loadSettings).toHaveBeenCalled();
    expect(createToggleSwitch).toHaveBeenCalledTimes(2);
    expect(applyMotionPreference).toHaveBeenCalledWith(baseSettings.motionEffects);
    expect(generateRandomCard.mock.calls[0][3]).toBe(false);
    expect(typeof setupRandomJudokaPage).toBe("function");
  });
});
