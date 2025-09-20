import { test, expect } from "@playwright/test";
import selectors from "../../helpers/selectors";

test.describe("Classic Battle page scaffold", () => {
  test("loads without console errors and has scoreboard nodes", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text() + " at " + msg.location().url);
    });
    await page.route("https://js-de.sentry-cdn.com/**", (route) =>
      route.fulfill({ body: "", contentType: "application/javascript" })
    );
    await page.goto("/src/pages/battleClassic.html");

    await expect(page.locator(selectors.roundMessage())).toBeVisible();
    await expect(page.locator(selectors.nextRoundTimer())).toBeVisible();
    await expect(page.locator(selectors.roundCounter())).toBeVisible();
    await expect(page.locator(selectors.scoreDisplay())).toBeVisible();

    expect(errors, `Console errors detected: ${errors.join("\n")}`).toHaveLength(0);
  });
});
