import { expect } from "@playwright/test";

export const NAV_RANDOM_JUDOKA = "nav-12";
export const NAV_CLASSIC_BATTLE = "nav-1";
export const NAV_UPDATE_JUDOKA = "nav-9";
export const NAV_BROWSE_JUDOKA = "nav-7";
export const NAV_MEDITATION = "nav-11";
export const NAV_SETTINGS = "nav-13";

/**
 * Verify common page elements like title, navigation bar and logo.
 * Optionally verify page-specific assertions.
 *
 * @pseudocode
 * 1. Assert the page title contains "Ju-Do-Kon!".
 * 2. Ensure the `<nav>` element and logo image are visible.
 * 3. For each id in `linkIds`, assert the corresponding `data-testid` link is visible.
 * 4. For each assertion in `assertions`, perform the check.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {string[]} [linkIds=[]] - Navigation link test IDs to verify.
 * @param {Array<{type: string, text?: string, selector?: string}>} [assertions=[]] - Additional assertions.
 */
export async function verifyPageBasics(page, linkIds = [], assertions = []) {
  await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "JU-DO-KON! Logo" })).toBeVisible();
  for (const id of linkIds) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  for (const assertion of assertions) {
    if (assertion.type === "heading") {
      await expect(page.getByRole("heading", { name: assertion.text })).toBeVisible();
    } else if (assertion.type === "locator") {
      await expect(page.locator(assertion.selector)).toHaveCount(1);
    } else if (assertion.type === "text") {
      await expect(page.getByText(assertion.text)).toBeVisible();
    }
  }
}
