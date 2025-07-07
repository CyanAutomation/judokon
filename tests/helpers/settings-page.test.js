import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const baseSettings = {
  sound: true,
  fullNavMap: true,
  motionEffects: true,
  displayMode: "light",
  gameModes: {}
};

describe("settingsPage module", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="sound-toggle" type="checkbox">
      <input id="navmap-toggle" type="checkbox">
      <input id="motion-toggle" type="checkbox">
      <select id="display-mode-select"></select>
      <section id="game-mode-toggle-container"></section>
    `;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("loads settings and game modes on DOMContentLoaded", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const fetchData = vi.fn().mockResolvedValue([]);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchDataWithErrorHandling: fetchData
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(loadSettings).toHaveBeenCalled();
    expect(fetchData).toHaveBeenCalled();
  });
});
