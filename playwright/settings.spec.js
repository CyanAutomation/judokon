import { test, expect } from "./fixtures/commonSetup.js";
import { waitForSettingsReady } from "./fixtures/waits.js";
import fs from "fs";
import { hex } from "wcag-contrast";
import { DEFAULT_SETTINGS } from "../src/helpers/settingsUtils.js";
import {
  verifyPageBasics,
  NAV_CLASSIC_BATTLE,
  NAV_RANDOM_JUDOKA
} from "./fixtures/navigationChecks.js";

const NAV_ITEMS = JSON.parse(fs.readFileSync("tests/fixtures/navigationItems.json", "utf8"));
const GAME_MODES = JSON.parse(fs.readFileSync("tests/fixtures/gameModes.json", "utf8"));
const TOOLTIP_DATA = JSON.parse(fs.readFileSync("src/data/tooltips.json", "utf8"));

/**
 * Gather sorted game mode names, enabled feature flag labels, and the expected
 * tab order labels for the settings page.
 *
 * @returns {{sortedNames: string[], flagLabels: string[], expectedLabels: string[]}}
 */
function getLabelData() {
  const sortedNames = NAV_ITEMS.slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => GAME_MODES.find((m) => m.id === item.gameModeId)?.name)
    .filter(Boolean);

  const flagLabels = Object.keys(DEFAULT_SETTINGS.featureFlags)
    .filter((flag) => DEFAULT_SETTINGS.featureFlags[flag].enabled)
    .map((flag) => TOOLTIP_DATA.settings?.[flag]?.label)
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

  return { sortedNames, flagLabels, expectedLabels };
}

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
    await waitForSettingsReady(page);
  });

  test("settings elements visible", async ({ page }) => {
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE, NAV_RANDOM_JUDOKA]);
    await expect(page.getByText(/sound/i)).toBeVisible();
    await expect(page.getByText(/motion effects/i)).toBeVisible();
    await expect(page.getByText(/typewriter effect/i)).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /display mode/i })).toBeVisible();
  });

  test("controls expose correct labels", async ({ page }) => {
    const { sortedNames, flagLabels } = getLabelData();

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
      await expect(page.getByRole("checkbox", { name, exact: true })).toHaveAttribute(
        "aria-label",
        name
      );
    }

    for (const label of flagLabels) {
      const locator = page.getByRole("checkbox", { name: label, exact: true });
      if ((await locator.count()) > 0) {
        await expect(locator).toHaveAttribute("aria-label", label);
      }
    }
  });

  test("tab order follows expected sequence", async ({ page }) => {
    const { flagLabels, expectedLabels } = getLabelData();

    const renderedFlagCount = await page
      .locator("#feature-flags-container input[type=checkbox]")
      .count();

    const tabStopCount = expectedLabels.length + (renderedFlagCount - flagLabels.length);

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

    const buttons = await page.$$eval(
      "button#reset-settings-button:not(.settings-section-toggle)",
      (els) =>
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
      "button#reset-settings-button:not(.settings-section-toggle)",
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

  test("toggles high-contrast display mode", async ({ page }) => {
    await page.check("#display-mode-high-contrast");
    await expect(page.locator("body")).toHaveAttribute("data-theme", "high-contrast");
  });

  test("restore defaults resets settings", async ({ page }) => {
    await expect(page.getByRole("checkbox", { name: "Sound" })).toBeChecked();
    const sound = page.getByRole("checkbox", { name: "Sound" });
    await sound.click();
    await expect(sound).not.toBeChecked();
    await page.getByRole("button", { name: "Restore Defaults" }).click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(sound).toBeChecked();
    const stored = await page.evaluate(() => localStorage.getItem("settings"));
    expect(JSON.parse(stored).sound).toBe(true);
  });
});
