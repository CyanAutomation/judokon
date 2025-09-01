import { expect } from "@playwright/test";

export const NAV_RANDOM_JUDOKA = "nav-12";
export const NAV_CLASSIC_BATTLE = "nav-1";
export const NAV_UPDATE_JUDOKA = "nav-9";
export const NAV_BROWSE_JUDOKA = "nav-7";
export const NAV_MEDITATION = "nav-11";
export const NAV_SETTINGS = "nav-13";

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
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "JU-DO-KON! Logo" })).toBeVisible();
  for (const id of linkIds) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
}
