import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";
import { setupFlags } from "../../src/pages/index.js";

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
    const { toggleVerbose } = await setupFlags();

    // Get the verbose elements
    const checkbox = document.getElementById("verbose-toggle");
    const section = document.getElementById("cli-verbose-section");
    const log = document.getElementById("cli-verbose-log");

    expect(checkbox).toBeTruthy();
    expect(section).toBeTruthy();
    expect(log).toBeTruthy();

    // Initially, verbose should be disabled
    expect(checkbox.checked).toBe(false);
    expect(section.hidden).toBe(true);
    expect(section.getAttribute("aria-expanded")).toBe("false");

    // Enable verbose using the internal toggle helper
    await toggleVerbose(true);

    // Now verbose section should be visible and expanded
    expect(checkbox.checked).toBe(true);
    expect(section.hidden).toBe(false);
    expect(section.getAttribute("aria-expanded")).toBe("true");

    // The log should have focus
    expect(document.activeElement).toBe(log);
  });

  it("hides verbose section when verbose is disabled", async () => {
    const mod = await loadBattleCLI();
    await mod.init();
    const { toggleVerbose } = await setupFlags();

    // Get the verbose elements
    const checkbox = document.getElementById("verbose-toggle");
    const section = document.getElementById("cli-verbose-section");

    // Enable verbose first
    await toggleVerbose(true);

    expect(checkbox.checked).toBe(true);
    expect(section.hidden).toBe(false);

    // Disable verbose
    await toggleVerbose(false);

    // Now verbose section should be hidden
    expect(checkbox.checked).toBe(false);
    expect(section.hidden).toBe(true);
    expect(section.getAttribute("aria-expanded")).toBe("false");
  });
});
