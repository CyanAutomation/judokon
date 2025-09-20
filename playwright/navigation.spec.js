import { test, expect } from "./fixtures/commonSetup.js";
import {
  NAV_CLASSIC_BATTLE,
  NAV_BROWSE_JUDOKA,
  NAV_UPDATE_JUDOKA,
  NAV_MEDITATION,
  NAV_RANDOM_JUDOKA,
  NAV_SETTINGS
} from "./fixtures/navigationChecks.js";

const links = [
  { id: NAV_CLASSIC_BATTLE, url: "/src/pages/battleClassic.html" },
  { id: NAV_BROWSE_JUDOKA, url: "/src/pages/browseJudoka.html" },
  { id: NAV_UPDATE_JUDOKA, url: "/src/pages/updateJudoka.html" },
  { id: NAV_MEDITATION, url: "/src/pages/meditation.html" },
  { id: NAV_RANDOM_JUDOKA, url: "/src/pages/randomJudoka.html" },
  { id: NAV_SETTINGS, url: "/src/pages/settings.html" }
];

test("navigation links navigate to expected pages", async ({ page }) => {
  for (const { id, url } of links) {
    await page.goto("/");
    await page.evaluate(() => window.navReadyPromise);
    const { origin } = new URL(page.url());
    const locator = page.getByTestId(id);
    if (await locator.isVisible()) {
      await locator.click();
      await expect(page).toHaveURL(`${origin}${url}`);
    }
  }
});
