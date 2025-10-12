import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI cliShortcuts flag", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("does not toggle when cliShortcuts is disabled", async () => {
    const mod = await loadBattleCLI({ cliShortcuts: false });
    await mod.init();
    const { wireEvents } = await import("../../src/pages/index.js");
    wireEvents();
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(true);
    // Natural event dispatch through the global listener
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(true);
  });

  it("toggles when cliShortcuts is enabled", async () => {
    const mod = await loadBattleCLI({ cliShortcuts: true });
    await mod.init();
    const { wireEvents } = await import("../../src/pages/index.js");
    wireEvents();
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(true);
  });

  it("collapses the shortcuts overlay when the flag is disabled", async () => {
    const mod = await loadBattleCLI({ cliShortcuts: true });
    await mod.init();
    const { wireEvents } = await import("../../src/pages/index.js");
    wireEvents();
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(true);
    const body = document.getElementById("cli-shortcuts-body");
    expect(body?.style.display ?? "").toBe("");

    const { __test } = await import("../../src/pages/battleCLI/init.js");
    __test.showShortcutsPanel();
    expect(sec.hidden).toBe(false);
    expect(body?.style.display ?? "").toBe("");

    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    setFlag("cliShortcuts", false);

    expect(sec.hidden).toBe(true);
    expect(sec.style.display).toBe("none");
    expect(body?.style.display).toBe("none");

    setFlag("cliShortcuts", true);

    expect(sec.hidden).toBe(true);
    expect(sec.hasAttribute("hidden")).toBe(true);
    expect(sec.style.display).toBe("");
    expect(body?.style.display).toBe("none");
    expect(localStorage.getItem("battleCLI.shortcutsCollapsed")).toBe("1");
  });

  it("keeps shortcuts collapsed when enabling the flag after it was disabled", async () => {
    const mod = await loadBattleCLI({ cliShortcuts: false });
    await mod.init();
    const { wireEvents } = await import("../../src/pages/index.js");
    wireEvents();
    const sec = document.getElementById("cli-shortcuts");
    const body = document.getElementById("cli-shortcuts-body");

    expect(sec.hidden).toBe(true);
    expect(sec.style.display).toBe("none");
    expect(body?.style.display ?? "").toBe("");

    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    setFlag("cliShortcuts", true);

    expect(sec.hidden).toBe(true);
    expect(sec.hasAttribute("hidden")).toBe(true);
    expect(sec.style.display).toBe("");
    expect(body?.style.display ?? "").toBe("");
    expect(localStorage.getItem("battleCLI.shortcutsCollapsed")).toBeNull();
  });
});
