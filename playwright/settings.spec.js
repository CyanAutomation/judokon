import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_CLASSIC_BATTLE,
  NAV_RANDOM_JUDOKA
} from "./fixtures/navigationChecks.js";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/navigationItems.json", (route) =>
      route.fulfill({ path: "tests/fixtures/navigationItems.json" })
    );
    await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/Classic Battle/i).waitFor({ state: "attached" });
    await page.locator("#display-settings-toggle").click();
    await page.locator("#general-settings-toggle").click();
    await page.locator("#game-modes-toggle").click();
  });

  test("page loads", async ({ page }) => {
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE, NAV_RANDOM_JUDOKA]);
  });

  test("mode toggle visible", async ({ page }) => {
    await page.getByLabel(/Classic Battle/i).waitFor({ state: "attached" });
    await expect(page.getByText(/Classic Battle/i)).toBeVisible();
  });

  test("essential elements visible", async ({ page }) => {
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE, NAV_RANDOM_JUDOKA]);
    await expect(page.getByText(/sound/i)).toBeVisible();
    await expect(page.getByText(/motion effects/i)).toBeVisible();
    await expect(page.getByText(/typewriter effect/i)).toBeVisible();
    await expect(page.getByLabel(/display mode/i)).toBeVisible();
  });

  test("controls expose correct labels and follow tab order", async ({ page }) => {
    await page.getByLabel(/Classic Battle/i).waitFor({ state: "attached" });

    const navigationItems = await page.evaluate(async () => {
      const res = await fetch("/tests/fixtures/navigationItems.json");
      return res.json();
    });

    const sortedNames = navigationItems
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((m) => m.name);

    const expectedLabels = [
      "Display Mode",
      "Sound",
      "Motion Effects",
      "Typewriter Effect",
      ...sortedNames
    ];

    await expect(page.locator("#sound-toggle")).toHaveAttribute("aria-label", "Sound");
    await expect(page.locator("#motion-toggle")).toHaveAttribute("aria-label", "Motion Effects");
    await expect(page.locator("#typewriter-toggle")).toHaveAttribute(
      "aria-label",
      "Typewriter Effect"
    );

    await expect(page.locator("#game-mode-toggle-container input[type=checkbox]")).toHaveCount(
      sortedNames.length
    );

    for (const name of sortedNames) {
      await expect(page.getByLabel(name, { exact: true })).toHaveAttribute("aria-label", name);
    }

    await page.focus("#display-mode-select");

    const activeLabels = [];
    for (let i = 0; i < expectedLabels.length; i++) {
      const label = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "";
        const aria = el.getAttribute("aria-label");
        if (aria) return aria;
        if (el.labels && el.labels[0]) return el.labels[0].textContent.trim();
        return "";
      });
      if (label) {
        activeLabels.push(label);
      } else {
        // ignore non-labeled focus targets
        i--;
      }
      await page.keyboard.press("Tab");
    }

    expect(activeLabels).toEqual(expectedLabels);
  });
});
