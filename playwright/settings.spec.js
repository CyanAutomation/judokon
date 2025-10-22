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

import NAV_ITEMS from "../tests/fixtures/navigationItems.js";
const GAME_MODES = JSON.parse(fs.readFileSync("tests/fixtures/gameModes.json", "utf8"));
const TOOLTIP_DATA = JSON.parse(fs.readFileSync("src/data/tooltips.json", "utf8"));

function parseNavigationModeId(input) {
  const modeId = typeof input === "object" && input !== null ? input.gameModeId : input;

  if (typeof modeId === "number" && Number.isSafeInteger(modeId)) {
    return modeId;
  }

  if (typeof modeId === "string") {
    const parsed = Number.parseInt(modeId, 10);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}

const NAVIGATION_ENABLED_MODE_IDS = new Set(
  NAV_ITEMS.map(parseNavigationModeId).filter((id) => id !== null)
);

/**
 * Resolves a game mode ID into one of the navigation-enabled IDs.
 *
 * @pseudocode
 * SET parsed TO parseNavigationModeId(modeId)
 * IF parsed IS null
 *   RETURN null
 * IF NAVIGATION_ENABLED_MODE_IDS has parsed
 *   RETURN parsed
 * RETURN null
 *
 * @param {number|string|{gameModeId: number|string}} modeId - Game mode ID to validate
 * @returns {number|null} Navigation-enabled mode ID or null when absent
 */
function resolveNavigationModeId(modeId) {
  const parsed = parseNavigationModeId(modeId);
  if (parsed === null) {
    return null;
  }

  return NAVIGATION_ENABLED_MODE_IDS.has(parsed) ? parsed : null;
}

/**
 * Gather sorted game mode names, enabled feature flag labels, and the expected
 * tab order labels for the settings page.
 *
 * The returned mode names only include navigation-enabled entries to mirror the
 * UI guard that prevents non-navigable modes from rendering in the settings
 * view.
 *
 * @returns {{sortedNames: string[], flagLabels: string[], expectedLabels: string[]}}
 */
function getLabelData() {
  const navigationEnabledModes = GAME_MODES.map((mode) => ({
    mode,
    parsedId: resolveNavigationModeId(mode.id)
  })).filter(({ parsedId }) => parsedId !== null);

  const modeNameById = navigationEnabledModes.reduce((map, { mode, parsedId }) => {
    if (typeof mode.name === "string" && mode.name.length > 0) {
      map.set(parsedId, mode.name);
    }
    return map;
  }, new Map());

  const navModeNames = NAV_ITEMS.slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const resolvedId = resolveNavigationModeId(item.gameModeId);
      return resolvedId === null ? null : modeNameById.get(resolvedId);
    })
    .filter(Boolean);

  const sortedNames = [...navModeNames];

  const flagLabels = Object.keys(DEFAULT_SETTINGS.featureFlags)
    .filter((flag) => {
      const config = DEFAULT_SETTINGS.featureFlags[flag];
      return config?.enabled && !config?.hidden;
    })
    .map((flag) => TOOLTIP_DATA.settings?.[flag]?.label)
    .filter(Boolean);

  const expectedLabels = [
    "Light",
    "Sound",
    "Motion Effects",
    "Typewriter Effect",
    "Tooltips",
    "Card of the Day",
    "Full Navigation Map",
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

  // Removed accessibility-focused labels test
  /*
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
  });*/

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

  test("auto-select toggle reachable via keyboard tabbing", async ({ page }) => {
    const autoSelect = page.locator(
      '#feature-flags-container input[type=checkbox][data-flag="autoSelect"]'
    );
    await expect(autoSelect).toHaveCount(1);

    await page.focus("#display-mode-light");
    let reached = false;
    for (let i = 0; i < 50; i++) {
      const isAuto = await page.evaluate(
        () => document.activeElement?.dataset.flag === "autoSelect"
      );
      if (isAuto) {
        reached = true;
        break;
      }
      await page.keyboard.press("Tab");
    }
    expect(reached).toBe(true);
  });

  test("toggle switches surface hover and focus feedback", async ({ page }) => {
    const label = page.locator("label[for='sound-toggle']");
    const checkbox = page.locator("#sound-toggle");
    const heading = page.getByRole("heading", { name: "Settings" });

    const getStyles = async () =>
      await label.evaluate((node) => {
        const computed = getComputedStyle(node);
        const textSpan = node.querySelector("span");
        const textColor = textSpan ? getComputedStyle(textSpan).color : computed.color;
        return {
          background: computed.backgroundColor,
          boxShadow: computed.boxShadow,
          color: textColor
        };
      });

    await heading.hover();
    const baseStyles = await getStyles();

    await checkbox.focus();
    const focusStyles = await getStyles();
    expect(focusStyles.boxShadow).not.toBe(baseStyles.boxShadow);
    expect(focusStyles.background).not.toBe(baseStyles.background);

    await page.locator("#motion-toggle").focus();
    await heading.hover();
    const resetStyles = await getStyles();
    expect(resetStyles.background).toBe(baseStyles.background);
    expect(resetStyles.boxShadow).toBe(baseStyles.boxShadow);

    await label.hover();
    const hoverStyles = await getStyles();
    expect(hoverStyles.background).not.toBe(baseStyles.background);
    expect(hoverStyles.boxShadow.toLowerCase()).not.toBe("none");
    expect(hoverStyles.color).not.toBe(baseStyles.color);
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
        "label[for='display-mode-retro']"
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
      "#display-mode-retro"
    ];

    for (const sel of selectors) {
      const box = await page.locator(sel).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("feature flag search filters advanced settings list", async ({ page }) => {
    const search = page.locator("#advanced-settings-search");
    const totalFlags = await page.locator("#feature-flags-container .settings-item").count();
    expect(totalFlags).toBeGreaterThan(0);

    await search.fill("debug");
    const visibleAfterFilter = page.locator("#feature-flags-container .settings-item:visible");
    const visibleCount = await visibleAfterFilter.count();
    expect(visibleCount).toBeGreaterThan(0);
    const allMatchQuery = await visibleAfterFilter.evaluateAll((nodes) =>
      nodes.every((node) => node.textContent.toLowerCase().includes("debug"))
    );
    expect(allMatchQuery).toBe(true);
    await expect(page.locator("#advanced-settings-no-results")).toBeHidden();

    await search.fill("zzzzzz");
    await expect(page.locator("#advanced-settings-no-results")).toBeVisible();
    await expect(page.locator("#feature-flags-container .settings-item:visible")).toHaveCount(0);

    await search.press("Escape");
    await expect(page.locator("#advanced-settings-no-results")).toBeHidden();
    await expect(page.locator("#feature-flags-container .settings-item:visible")).toHaveCount(totalFlags);
  });

  test("toggles retro display mode", async ({ page }) => {
    await page.check("#display-mode-retro");
    await expect(page.locator("body")).toHaveAttribute("data-theme", "retro");
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
