/**
 * Register routes to serve fixture data for core JSON files and flag images.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<void>} Promise resolving when all routes have been registered in parallel.
 */
export async function registerCommonRoutes(page) {
  await Promise.all([
    page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka.json" })
    ),
    page.route("**/src/data/gokyo.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gokyo.json" })
    ),
    page.route("**/src/data/countryCodeMapping.json", (route) =>
      route.fulfill({ path: "tests/fixtures/countryCodeMapping.json" })
    ),
    page.route("**/src/data/tooltips.json", (route) =>
      route.fulfill({ path: "tests/fixtures/tooltips.json" })
    ),
    page.route("https://flagcdn.com/**", (route) =>
      route.fulfill({ path: "src/assets/countryFlags/placeholder-flag.png" })
    ),
    page.route("https://esm.sh/ajv@6*", (route) =>
      route.fulfill({ path: "src/vendor/ajv6.min.js" })
    ),
    page.route("**/marked.esm.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "export const marked={parse:(m)=>m};"
      })
    )
  ]);
}
