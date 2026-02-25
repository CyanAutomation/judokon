import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSettingsDom, resetDom } from "../utils/testUtils.js";

const controlsFromDom = () => ({
  soundToggle: null,
  motionToggle: null,
  displayRadios: document.querySelectorAll('input[name="display-mode"]'),
  headerThemeRadios: document.querySelectorAll('input[name="header-display-mode"]'),
  typewriterToggle: null
});

describe("display mode transitions", () => {
  let startTransition;

  beforeEach(() => {
    document.body.appendChild(createSettingsDom());
    startTransition = vi.fn((fn) => {
      fn();
      return Promise.resolve();
    });
    document.startViewTransition = startTransition;
  });

  afterEach(() => {
    delete document.startViewTransition;
    resetDom();
  });

  it("uses startViewTransition when mode changes", async () => {
    const { attachToggleListeners } = await import("../../src/helpers/settings/listenerUtils.js");
    const controls = controlsFromDom();
    const getCurrentSettings = () => ({ displayMode: "light" });
    const handleUpdate = vi.fn();

    attachToggleListeners(controls, getCurrentSettings, handleUpdate);

    const dark = document.getElementById("display-mode-dark");
    dark.checked = true;
    dark.dispatchEvent(new Event("change"));

    expect(startTransition).toHaveBeenCalledTimes(1);
  });

  it("reverts with a transition when update fails", async () => {
    const { attachToggleListeners } = await import("../../src/helpers/settings/listenerUtils.js");
    const controls = controlsFromDom();
    const getCurrentSettings = () => ({ displayMode: "light" });
    const handleUpdate = vi.fn((_, __, revert) => revert());

    attachToggleListeners(controls, getCurrentSettings, handleUpdate);

    const dark = document.getElementById("display-mode-dark");
    dark.checked = true;
    dark.dispatchEvent(new Event("change"));

    expect(startTransition).toHaveBeenCalledTimes(2);
  });

  it("syncs header quick toggle when display preferences changes", async () => {
    const { attachToggleListeners } = await import("../../src/helpers/settings/listenerUtils.js");
    const controls = controlsFromDom();
    const getCurrentSettings = () => ({ displayMode: "light" });
    const handleUpdate = vi.fn();

    attachToggleListeners(controls, getCurrentSettings, handleUpdate);

    const displayDark = document.getElementById("display-mode-dark");
    const headerDark = document.getElementById("header-display-mode-dark");

    displayDark.checked = true;
    displayDark.dispatchEvent(new Event("change"));

    expect(headerDark.checked).toBe(true);
    expect(headerDark.tabIndex).toBe(0);
  });

  it("syncs display preferences when header quick toggle changes", async () => {
    const { attachToggleListeners } = await import("../../src/helpers/settings/listenerUtils.js");
    const controls = controlsFromDom();
    const getCurrentSettings = () => ({ displayMode: "light" });
    const handleUpdate = vi.fn();

    attachToggleListeners(controls, getCurrentSettings, handleUpdate);

    const headerDark = document.getElementById("header-display-mode-dark");
    const displayDark = document.getElementById("display-mode-dark");

    headerDark.checked = true;
    headerDark.dispatchEvent(new Event("change"));

    expect(displayDark.checked).toBe(true);
    expect(displayDark.tabIndex).toBe(0);
  });
});
