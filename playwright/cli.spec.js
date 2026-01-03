import { test, expect } from "./fixtures/battleCliFixture.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const DEFAULT_CLI_URL = "http://127.0.0.1:5000/src/pages/battleCLI.html";

const buildCliUrl = () => {
  const url = process.env.CLI_TEST_URL ?? DEFAULT_CLI_URL;

  try {
    return new URL(url).toString();
  } catch (cause) {
    throw new Error(`Invalid CLI_TEST_URL: ${url}. Must be a valid URL.`, { cause });
  }
};

test("CLI skeleton and helpers smoke", async ({ page }) => {
  // User story: a player landing on the CLI can see the stat list hydrate and a live countdown update
  // while helpers keep the experience responsive for keyboard play.
  await page.goto(buildCliUrl());

  await waitForTestApi(page);

  const stats = page.locator("#cli-stats");
  await expect(stats).toBeVisible();
  await expect(stats).toHaveAttribute("aria-busy", "false");

  const firstStat = stats.locator(".cli-stat").first();
  await expect(firstStat).toBeVisible();
  await expect(firstStat).not.toHaveClass(/skeleton/);
  await expect(firstStat).toHaveAttribute("data-stat", /.+/);
  await expect(firstStat).toHaveText(/\[\d\]\s+.+/);

  const countdown = page.locator("#cli-countdown");
  await expect(countdown).toBeVisible();

  // Start the round via the user-visible keyboard flow and observe countdown updates
  const startHint = page.locator("#snackbar-container");
  await expect(startHint).toContainText("Press Enter to start the match.", { timeout: 5_000 });
  await page.keyboard.press("Enter");

  await expect(countdown).toHaveText(/Time remaining:\s*\d+/, { timeout: 5_000 });
  const initialCountdown = await countdown.textContent();
  expect(initialCountdown).not.toBeNull();
  // Verify initial countdown contains a number before polling for changes
  expect(initialCountdown).toMatch(/Time remaining:\s*\d+/);
  await expect
    .poll(async () => countdown.textContent(), { timeout: 5_000 })
    .not.toBe(initialCountdown);
});
