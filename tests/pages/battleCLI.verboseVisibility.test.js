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

    // Get the verbose elements
    const checkbox = document.getElementById("verbose-toggle");
    const section = document.getElementById("cli-verbose-section");
    const log = document.getElementById("cli-verbose-log");

    expect(checkbox).toBeTruthy();
    expect(section).toBeTruthy();
    expect(log).toBeTruthy();

    // Initially, verbose should be disabled
    expect(section.hidden).toBe(true);
    expect(section.getAttribute("aria-expanded")).toBe("false");

    // Enable verbose by checking the checkbox
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));

    // Wait for the async toggle to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Now verbose section should be visible and expanded
    expect(section.hidden).toBe(false);
    expect(section.getAttribute("aria-expanded")).toBe("true");

    // The log should have focus
    expect(document.activeElement).toBe(log);
  });

  it("hides verbose section when verbose is disabled", async () => {
    const mod = await loadBattleCLI();
    await mod.init();

    // Get the verbose elements
    const checkbox = document.getElementById("verbose-toggle");
    const section = document.getElementById("cli-verbose-section");

    // Enable verbose first
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(section.hidden).toBe(false);

    // Disable verbose
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Now verbose section should be hidden
    expect(section.hidden).toBe(true);
    expect(section.getAttribute("aria-expanded")).toBe("false");
  });
});