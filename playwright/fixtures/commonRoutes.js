import fs from "fs";

/**
 * Register routes to serve fixture data for core JSON files and flag images.
 *
 * @pseudocode
 * 1. Register fixture JSON for key data files.
 * 2. Proxy portraits and other static assets from local directories.
 * 3. Serve fonts and vendor scripts from local copies.
 * 4. Fulfill additional JSON requests with fixtures when available.
 * 5. Provide placeholder responses for external assets such as flags.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @returns {Promise<void>} Promise resolving when all routes have been registered in parallel.
 */
export async function registerCommonRoutes(page) {
  await Promise.all([
    page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka.json" })
    ),
    // Serve local assets directly to avoid flakey fetches during fast navigations
    page.route("**/src/assets/judokaPortraits/*", (route) => {
      const file = route.request().url().split("/src/assets/judokaPortraits/")[1];
      route.fulfill({ path: `src/assets/judokaPortraits/${file}` });
    }),
    page.route("**/src/assets/images/*", (route) => {
      const file = route.request().url().split("/src/assets/images/")[1];
      route.fulfill({ path: `src/assets/images/${file}` });
    }),
    page.route("**/src/assets/fonts/*", (route) => {
      const file = route.request().url().split("/src/assets/fonts/")[1];
      route.fulfill({ path: `src/assets/fonts/${file}` });
    }),
    page.route("**/src/data/gokyo.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gokyo.json" })
    ),
    page.route("**/src/data/gameModes.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gameModes.json" })
    ),
    page.route("**/src/data/tooltips.json", (route) =>
      route.fulfill({ path: "src/data/tooltips.json" })
    ),
    page.route("**/src/data/navigationItems.json", (route) =>
      route.fulfill({ path: "tests/fixtures/navigationItems.json" })
    ),
    // Ensure country code mapping is always available and not aborted by navigation
    page.route("**/src/data/countryCodeMapping.json", (route) =>
      route.fulfill({ path: "src/data/countryCodeMapping.json" })
    ),
    page.route("**/src/data/*.json", (route) => {
      const file = route.request().url().split("/").pop();
      const fixturePath = `tests/fixtures/${file}`;
      if (fs.existsSync(fixturePath)) {
        route.fulfill({ path: fixturePath });
      } else {
        route.continue();
      }
    }),
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
    ),
    page.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({
        contentType: "text/css",
        body: `@font-face {
  font-family: "Russo One";
  src: url("/src/assets/fonts/RussoOneRegular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Open Sans";
  src: url("/src/assets/fonts/OpenSansRegular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Open Sans";
  src: url("/src/assets/fonts/OpenSans600.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
`
      })
    ),
    page.route("https://fonts.gstatic.com/**", (route) => {
      const url = route.request().url();
      if (url.includes("Russo")) {
        route.fulfill({ path: "src/assets/fonts/RussoOneRegular.woff2" });
      } else if (url.includes("600") || url.includes("SemiBold")) {
        route.fulfill({ path: "src/assets/fonts/OpenSans600.woff2" });
      } else {
        route.fulfill({ path: "src/assets/fonts/OpenSansRegular.woff2" });
      }
    }),
    // Ensure stat names are always served promptly to avoid flaky fetches
    page.route("**/src/data/statNames.json", (route) =>
      route.fulfill({ path: "src/data/statNames.json" })
    )
  ]);
}
