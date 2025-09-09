import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Debug panel and state badge gating", () => {
  test("enables debug panel when test mode flag is on", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;
    // Force feature flags
    await import("../../src/helpers/featureFlags.js");
    // Use overrides to enable test mode and badge
    window.__FF_OVERRIDES = { enableTestMode: true, battleStateBadge: true };

    // Manually call initDebugPanel to ensure it runs with the overrides
    const { initDebugPanel } = await import("../../src/helpers/classicBattle/debugPanel.js");
    initDebugPanel();

    // Debug panel placeholder should be replaced with details element
    const panel = document.getElementById("debug-panel");
    expect(panel).toBeTruthy();
    expect(panel.tagName).toBe("DETAILS");
    const output = panel.querySelector("#debug-output");
    expect(output).toBeTruthy();

    // Now run the full init to test badge functionality
    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") mod.init();

    // Battle state badge should be visible with initial text
    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge.hasAttribute("hidden")).toBe(false);
    expect((badge.textContent || "").length).toBeGreaterThan(0);
  });
});
