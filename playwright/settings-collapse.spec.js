import { test, expect } from "@playwright/test";

test.describe("Battle CLI settings collapse", () => {
  test("settings toggle exists and toggles aria-expanded / body visibility", async ({ page }) => {
    // Adjust URL for local dev server used by test runner in CI; fallback to file:// if needed
    const serverUrl = process.env.CLI_TEST_URL || "http://localhost:3000/src/pages/battleCLI.html";
    // Try server URL first, fall back to file:// for local dev without a server
    try {
      await page.goto(serverUrl, { waitUntil: "load", timeout: 3000 });
    } catch {
      // use import.meta.url to resolve a file URL relative to this test
      const fileUrl = new URL("../src/pages/battleCLI.html", import.meta.url).href;
      await page.goto(fileUrl, { waitUntil: "load" });
    }
    const toggle = await page.locator("#cli-settings-toggle");
    await expect(toggle).toHaveCount(1);
    const body = await page.locator("#cli-settings-body");
    await expect(body).toHaveCount(1);
    // initial aria-expanded should be present
    const expanded = await toggle.getAttribute("aria-expanded");
    expect(["true", "false"]).toContain(expanded);
    // toggle and assert changed state
    const before = expanded === "true";
    await toggle.click();
    const afterAttr = await toggle.getAttribute("aria-expanded");
    expect(afterAttr).toBe(before ? "false" : "true");
    // ensure body visibility matches aria-expanded
    const bodyVisible = await body.isVisible();
    expect(bodyVisible).toBe(afterAttr === "true");
  });
});
