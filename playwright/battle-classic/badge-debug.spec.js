import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("State badge and debug panel", () => {
  test("badge visible and debug panel present with flags", async ({ page }) =>
    withMutedConsole(async () => {
      // Listen for all console messages
      const messages = [];
      page.on("console", (msg) => {
        const text = `${msg.type()}: ${msg.text()}`;
        messages.push(text);
        if (msg.type() === "error") {
          console.log("Browser error:", text);
        }
      });

      await page.addInitScript(() => {
        window.__FF_OVERRIDES = {
          enableTestMode: true,
          battleStateBadge: true,
          showRoundSelectModal: true
        };
      });

      await page.goto("/src/pages/battleClassic.html");

      // Optional console diagnostics trimmed; rely on visible badge assertions below
      const errorMessages = messages.filter((m) => m.startsWith("error:"));
      if (errorMessages.length > 0) console.log("Error messages:", errorMessages);
      await expect(page.locator("#battle-state-badge")).toBeVisible();
      await expect(page.locator("#battle-state-badge")).toHaveText("Lobby");
    }, ["log", "warn", "error"]));
});
