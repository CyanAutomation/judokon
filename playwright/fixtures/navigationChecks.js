import { expect } from "@playwright/test";

export const NAV_RANDOM_JUDOKA = "nav-12";
export const NAV_CLASSIC_BATTLE = "nav-1";
export const NAV_UPDATE_JUDOKA = "nav-9";
export const NAV_BROWSE_JUDOKA = "nav-7";
export const NAV_MEDITATION = "nav-11";
export const NAV_SETTINGS = "nav-13";

const normalizeNavLinks = (linkIds = []) =>
  linkIds.map((link) => (typeof link === "string" ? { id: link } : link));

const assertNavLinks = async (page, navLinks) => {
  for (const nav of navLinks) {
    const navLink = page.getByTestId(nav.id);
    await expect(navLink).toBeVisible();
    if (nav.text) {
      await expect(navLink).toHaveText(nav.text);
    }
    if (nav.href) {
      await expect(navLink).toHaveAttribute("href", nav.href);
    }
  }
};

const runAssertions = async (page, assertions) => {
  for (const assertion of assertions) {
    if (assertion.type === "heading") {
      await expect(page.getByRole("heading", { name: assertion.text })).toBeVisible();
    } else if (assertion.type === "locator") {
      await expect(page.locator(assertion.selector)).toHaveCount(1);
    } else if (assertion.type === "text") {
      await expect(page.getByText(assertion.text)).toBeVisible();
    } else if (assertion.type === "role") {
      await expect(page.getByRole(assertion.role, assertion.options)).toBeVisible();
    }
  }
};

/**
 * Verify common page elements like title, navigation bar and logo.
 * Optionally verify page-specific assertions and navigation destinations.
 *
 * @pseudocode
 * 1. Assert the page title contains "Ju-Do-Kon!".
 * 2. Ensure the `<nav>` element and logo image are visible (unless `expectNav` is false).
 * 3. For each entry in `linkIds`, assert the corresponding `data-testid` link is visible and matches
 *    the expected text/href when provided.
 * 4. For each assertion in `assertions`, perform the check.
 * 5. When `verifyNavTargets` is enabled, click through each navigation link and confirm the URL
 *    matches the expected destination.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {Array<string|{id: string, text?: string, href?: string, destination?: string}>} [linkIds=[]] -
 * Navigation link test IDs (or objects with navigation metadata) to verify.
 * @param {Array<{type: string, text?: string, selector?: string, role?: string, options?: object}>} [assertions=[]]
 * - Additional assertions.
 * @param {{ expectNav?: boolean, verifyNavTargets?: boolean }} [options] - Optional configuration flags.
 * @param {boolean} [options.expectNav=true] - When false, skip verifying that a navigation bar is visible.
 * @param {boolean} [options.verifyNavTargets=false] - When true, click each nav link and assert its destination.
 */
export async function verifyPageBasics(page, linkIds = [], assertions = [], options = {}) {
  await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  const navLinks = normalizeNavLinks(linkIds);
  const shouldExpectNav = options.expectNav ?? true;
  const navigation = page.getByRole("navigation").first();
  const logo = page.getByRole("img", { name: "JU-DO-KON! Logo" });
  const banner = page.getByRole("banner");
  const main = page.getByRole("main");
  if (shouldExpectNav) {
    await expect(navigation).toBeVisible();
  }
  await expect(logo).toBeVisible();
  await expect(banner).toBeVisible();
  await expect(main).toBeVisible();
  if (shouldExpectNav) {
    await assertNavLinks(page, navLinks);
  }
  await runAssertions(page, assertions);
  if (options.verifyNavTargets && shouldExpectNav) {
    await verifyNavigationTargets(page, navLinks);
  }
  return { navigation, logo, banner, main };
}

export async function verifyNavigationTargets(page, linkIds = []) {
  const originUrl = page.url();
  for (const nav of normalizeNavLinks(linkIds)) {
    const targetHref = nav.destination ?? nav.href;
    if (!targetHref) continue;
    const navLink = page.getByTestId(nav.id);
    const expectedUrl = new URL(targetHref, originUrl).toString();
    await navLink.click();
    await page.waitForURL(expectedUrl, { timeout: 10000 });
    await expect(page).toHaveURL(expectedUrl);
    await page.goto(originUrl);
    await expect(page).toHaveURL(originUrl);
  }
}
