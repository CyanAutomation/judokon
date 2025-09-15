import { test, expect } from "@playwright/test";

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

    await expect(page.locator("header #round-message")).toBeVisible();
    await expect(page.locator("header #next-round-timer")).toBeVisible();
    await expect(page.locator("header #round-counter")).toBeVisible();
    await expect(page.locator("header #score-display")).toBeVisible();

    expect(errors, `Console errors detected: ${errors.join("\n")}`).toHaveLength(0);
  });
});
