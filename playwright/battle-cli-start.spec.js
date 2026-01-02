import { test, expect } from "./fixtures/battleCliFixture.js";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("Battle CLI - Start", () => {
  const enableRoundSelectModal = async (page) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { ...(window.__FF_OVERRIDES || {}), showRoundSelectModal: true };
    });
  };

  test("starts via round select modal with controls ready (start-flow regression)", async ({
    page
  }) => {
    // Regression coverage: start-flow requirement/bug is tracked in progressPlaywright.md.
    await withMutedConsole(async () => {
      await enableRoundSelectModal(page);
      await page.goto("/src/pages/battleCLI.html");

      const roundModal = page.getByRole("dialog", { name: "Select Match Length" });
      await expect(roundModal).toBeVisible();
      await expect(
        roundModal.getByText("Use number keys (1-3) or arrow keys to select")
      ).toBeVisible();

      await roundModal.getByRole("button", { name: "Medium" }).click();
      await expect(roundModal).toBeHidden();

      await expect(page.getByTestId("round-counter")).toHaveText(/^Round 1 Target: 5$/);

      // With snackbar stacking, multiple snackbars may be present
      // Use getByText to find the specific message we care about
      const prompt = page.getByText("Select your move");
      await expect(prompt).toBeVisible();

      const statsContainer = page.getByRole("listbox", {
        name: "Select a stat with number keys 1-5"
      });
      await expect(statsContainer).toHaveAttribute("aria-busy", "false");
      const firstStat = page.locator(".cli-stat").first();
      await expect(firstStat).not.toHaveAttribute("aria-disabled", "true");
      await expect(firstStat).toHaveAttribute("tabindex", /^(0|-1)$/);

      await expect(page.locator("#seed-error")).toHaveText("");
      await expect(page.locator("#cli-countdown")).not.toHaveAttribute("data-status", "error");
    }, ["log", "info", "warn", "error", "debug"]);
  });

  test("shows validation error and keeps stats disabled until start", async ({ page }) => {
    await withMutedConsole(async () => {
      await enableRoundSelectModal(page);
      await page.goto("/src/pages/battleCLI.html");

      // Dismiss the modal to enable interaction with page elements
      const roundModal = page.getByRole("dialog", { name: "Select Match Length" });
      await expect(roundModal).toBeVisible();
      await roundModal.getByRole("button", { name: "Medium" }).click();
      await expect(roundModal).toBeHidden();

      // Test seed validation
      const seedInput = page.locator("#seed-input");
      await expect(seedInput).toBeVisible();
      await seedInput.type("1");
      await expect(seedInput).toHaveValue("1");
      await seedInput.press("Backspace");

      const seedError = page.locator("#seed-error");
      await expect(seedError).toHaveText("Invalid seed. Using default.");

      // After validation error, verify the battle state remains valid
      const statsContainer = page.getByRole("listbox", {
        name: "Select a stat with number keys 1-5"
      });
      await expect(statsContainer).toHaveAttribute("aria-busy", "false");
      await expect(page.getByTestId("round-counter")).toHaveText(/^Round 1 Target: 5$/);
      await expect(page.locator("#round-message")).toHaveText("");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
