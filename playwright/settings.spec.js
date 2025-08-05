import { test, expect } from "./fixtures/commonSetup.js";
import fs from "fs";
import { hex } from "wcag-contrast";
import { DEFAULT_SETTINGS } from "../src/helpers/settingsUtils.js";
import {
  verifyPageBasics,
  NAV_CLASSIC_BATTLE,
  NAV_RANDOM_JUDOKA
} from "./fixtures/navigationChecks.js";

test.describe.parallel("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/navigationItems.json", (route) =>
      route.fulfill({ path: "tests/fixtures/navigationItems.json" })
    );
    await page.route("**/src/data/gameModes.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gameModes.json" })
    );
    await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
    try {
      await page.getByLabel(/Classic Battle/i).waitFor({ state: "attached", timeout: 5000 });
    } catch (e) {
      const content = await page.content();
      console.error("Classic Battle label not found. Page content:\n", content);
      throw e;
    }
    await page.locator("#general-settings-toggle").click();
    await page.locator("#game-modes-toggle").click();
    await page.locator("#advanced-settings-toggle").click();
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

    const tooltips = JSON.parse(fs.readFileSync("src/data/tooltips.json", "utf8"));
    const flagLabels = Object.keys(DEFAULT_SETTINGS.featureFlags)
      .filter((flag) => DEFAULT_SETTINGS.featureFlags[flag].enabled)
      .map((flag) => tooltips.settings?.[flag]?.label)
      .filter(Boolean);

    const expectedLabels = [
      "Light",
      "Sound",
      "Motion Effects",
      "Typewriter Effect",
      "Tooltips",
      "Card of the Day",
      ...sortedNames,
      ...flagLabels
    ];

    const tabStopCount =
      expectedLabels.length +
      (Object.keys(DEFAULT_SETTINGS.featureFlags).length - flagLabels.length);

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

    for (const label of flagLabels) {
      const locator = page.getByLabel(label, { exact: true });
      if ((await locator.count()) > 0) {
        await expect(locator).toHaveAttribute("aria-label", label);
      }
    }

    await page.focus("#display-mode-light");

    const activeLabels = [];
    for (let i = 0; i < tabStopCount; i++) {
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

    for (const label of expectedLabels) {
      expect(activeLabels).toContain(label);
    }
  });

  test("controls meet minimum color contrast", async ({ page }) => {
    const rgbToHex = (rgb) => {
      const [r, g, b] = rgb
        .replace(/rgba?\(/, "")
        .replace(/\)/, "")
        .split(",")
        .map((v) => parseInt(v.trim(), 10));
      return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    };

    const buttons = await page.$$eval(".settings-section-toggle, #reset-settings-button", (els) =>
      els.map((el) => {
        const style = getComputedStyle(el);
        return { fg: style.color, bg: style.backgroundColor };
      })
    );

    const labels = await page.$$eval(
      [
        "label[for='sound-toggle']",
        "label[for='motion-toggle']",
        "label[for='typewriter-toggle']",
        "label[for='tooltips-toggle']",
        "label[for='display-mode-light']",
        "label[for='display-mode-dark']",
        "label[for='display-mode-high-contrast']"
      ].join(", "),
      (els) =>
        els.map((el) => {
          const style = getComputedStyle(el);
          let bg = style.backgroundColor;
          if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
            bg = getComputedStyle(document.body).backgroundColor;
          }
          return { fg: style.color, bg };
        })
    );

    for (const { fg, bg } of [...buttons, ...labels]) {
      const ratio = hex(rgbToHex(bg), rgbToHex(fg));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("controls meet 44px touch target size", async ({ page }) => {
    const selectors = [
      "#general-settings-toggle",
      "#game-modes-toggle",
      "#advanced-settings-toggle",
      "#reset-settings-button",
      "#sound-toggle",
      "#motion-toggle",
      "#typewriter-toggle",
      "#tooltips-toggle",
      "#display-mode-light",
      "#display-mode-dark",
      "#display-mode-high-contrast"
    ];

    for (const sel of selectors) {
      const box = await page.locator(sel).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
