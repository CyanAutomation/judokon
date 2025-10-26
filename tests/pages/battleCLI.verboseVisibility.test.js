import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI verbose mode visibility", () => {
  beforeEach(async () => {
    await cleanupBattleCLI();
  });

  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("shows verbose section and sets focus when verbose is enabled", async () => {
    const mod = await loadBattleCLI();
    await mod.init();

    const checkbox = document.getElementById("verbose-toggle");
    const section = document.getElementById("cli-verbose-section");
    const log = document.getElementById("cli-verbose-log");
    const indicator = document.getElementById("verbose-indicator");

    expect(checkbox).toBeTruthy();
    expect(section).toBeTruthy();
    expect(log).toBeTruthy();
    expect(indicator).toBeTruthy();

    expect(checkbox.checked).toBe(false);
    expect(section.hidden).toBe(true);
    expect(section.getAttribute("aria-expanded")).toBe("false");
    expect(indicator.style.display).toBe("none");

    checkbox.click();

    expect(checkbox.checked).toBe(true);
    expect(section.hidden).toBe(false);
    expect(section.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(log);
    expect(indicator.style.display).toBe("inline");
    expect(indicator.getAttribute("aria-hidden")).toBe("false");
  });

  it("responds to feature flag change events", async () => {
    const mod = await loadBattleCLI();
    await mod.init();

    const checkbox = document.getElementById("verbose-toggle");
    const section = document.getElementById("cli-verbose-section");
    const emitter = mod.featureFlagsEmitter;
    const setMockFlag = mod.setMockFlag;

    expect(checkbox).toBeTruthy();
    expect(section).toBeTruthy();
    expect(emitter).toBeInstanceOf(EventTarget);
    expect(typeof setMockFlag).toBe("function");

    expect(section.hidden).toBe(true);
    expect(section.getAttribute("aria-expanded")).toBe("false");

    setMockFlag("cliVerbose", true);
    emitter.dispatchEvent(new CustomEvent("change", { detail: { flag: "cliVerbose" } }));

    expect(section.hidden).toBe(false);
    expect(section.getAttribute("aria-expanded")).toBe("true");
    expect(checkbox.checked).toBe(true);

    setMockFlag("cliVerbose", false);
    emitter.dispatchEvent(new CustomEvent("change", { detail: { flag: "cliVerbose" } }));

    expect(section.hidden).toBe(true);
    expect(section.getAttribute("aria-expanded")).toBe("false");
    expect(checkbox.checked).toBe(false);
  });
});
