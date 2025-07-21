/**
 * Register routes to serve fixture data for core JSON files and flag images.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<void>} Promise resolving when routes have been registered.
 */
export async function registerCommonRoutes(page) {
  await page.route("**/src/data/judoka.json", (route) =>
    route.fulfill({ path: "tests/fixtures/judoka.json" })
  );
  await page.route("**/src/data/gokyo.json", (route) =>
    route.fulfill({ path: "tests/fixtures/gokyo.json" })
  );
  await page.route("**/src/data/countryCodeMapping.json", (route) =>
    route.fulfill({ path: "tests/fixtures/countryCodeMapping.json" })
  );
  await page.route("https://flagcdn.com/**", (route) =>
    route.fulfill({ path: "src/assets/countryFlags/placeholder-flag.png" })
  );
  await page.route("https://esm.sh/ajv@6*", (route) =>
    route.fulfill({ path: "src/vendor/ajv6.min.js" })
  );
  await page.route("**/marked.esm.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export const marked={parse:(m)=>m};"
    })
  );
}
