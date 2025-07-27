import { test, expect } from "./fixtures/commonSetup.js";
import fs from "fs";
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
    await page.locator("#general-settings-toggle").click();
    await page.locator("#game-modes-toggle").click();
  });

  test("page loads", async ({ page }) => {
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE, NAV_RANDOM_JUDOKA]);
  });

  test("mode toggle visible", async ({ page }) => {
    const toggle = page.getByLabel(/Classic Battle/i);
    await toggle.waitFor({ state: "attached" });
    await expect(toggle).toBeVisible();
  });

  test("essential elements visible", async ({ page }) => {
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE, NAV_RANDOM_JUDOKA]);
    await expect(page.getByText(/sound/i)).toBeVisible();
    await expect(page.getByText(/motion effects/i)).toBeVisible();
    await expect(page.getByText(/typewriter effect/i)).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /display mode/i })).toBeVisible();
  });

  test("controls expose correct labels and follow tab order", async ({ page }) => {
    await page.getByLabel(/Classic Battle/i).waitFor({ state: "attached" });

    const navItems = JSON.parse(fs.readFileSync("tests/fixtures/navigationItems.json", "utf8"));
    const gameModes = JSON.parse(fs.readFileSync("tests/fixtures/gameModes.json", "utf8"));

    const sortedNames = navItems
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => gameModes.find((m) => m.id === item.gameModeId)?.name)
      .filter(Boolean);

    const expectedLabels = [
      "Light",
      "Dark",
      "Gray",
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

    await page.focus("#display-mode-light");

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
