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
    const fetchJson = vi.fn().mockResolvedValue([]);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(loadSettings).toHaveBeenCalled();
    expect(fetchJson).toHaveBeenCalled();
    vi.useRealTimers();
  });
  it("renders checkboxes for all modes", async () => {
    vi.useFakeTimers();
    const gameModes = [
      { id: "classic", name: "Classic", category: "mainMenu" },
      { id: "blitz", name: "Blitz", category: "bonus" },
      { id: "dojo", name: "Dojo", category: "mainMenu" }
    ];
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const fetchJson = vi.fn().mockResolvedValue(gameModes);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const container = document.getElementById("game-mode-toggle-container");
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    expect(checkboxes).toHaveLength(3);
    expect(container.querySelector("#mode-classic")).toBeTruthy();
    expect(container.querySelector("#mode-dojo")).toBeTruthy();
    expect(container.querySelector("#mode-blitz")).toBeTruthy();
  });
});
