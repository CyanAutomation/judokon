import { expect } from "@playwright/test";

/**
 * Verify common page elements like title, navigation bar and logo.
 *
 * @pseudocode
 * 1. Assert the page title contains "Ju-Do-Kon!".
 * 2. Ensure the `<nav>` element and logo image are visible.
 * 3. For each id in `linkIds`, assert the corresponding `data-testid` link is visible.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string[]} [linkIds=[]] - Navigation link test IDs to verify.
 */
export async function verifyPageBasics(page, linkIds = []) {
  await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("img", { name: "JU-DO-KON! Logo" })).toBeVisible();
  for (const id of linkIds) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
}
