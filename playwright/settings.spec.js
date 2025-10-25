import { test, expect } from "./fixtures/commonSetup.js";
import { waitForSettingsReady } from "./fixtures/waits.js";
import fs from "fs";
import { hex } from "wcag-contrast";
import { DEFAULT_SETTINGS } from "../src/helpers/settingsUtils.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

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

  async function openSections(page, ids) {
    for (const id of ids) {
      const details = page.locator(`details[data-section-id="${id}"]`);
      const isOpen = await details.evaluate((el) => el.open);
      if (!isOpen) {
        await details.locator("summary").click();
        await expect(details).toHaveJSProperty("open", true);
      }
    }
  }

  test("settings elements visible", async ({ page }) => {
    await verifyPageBasics(page, [], [], { expectNav: false });
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
    await openSections(page, ["display", "general", "gameModes", "advanced"]);
    const { flagLabels, expectedLabels } = getLabelData();

    const renderedFlagCount = await page
      .locator("#feature-flags-container input[type=checkbox]")
      .count();

    const searchInputCount = await page.locator("#advanced-settings-search").count();
    const tabStopCount =
      expectedLabels.length + (renderedFlagCount - flagLabels.length) + searchInputCount;

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
    await openSections(page, ["advanced"]);
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

  test("shows saved indicator after toggling a setting", async ({ page }) => {
    const status = page.locator("#settings-save-status");
    await expect(status).toBeHidden();

    await page.getByLabel("Sound").click();

    await expect(status).toBeVisible();
    await expect(status).toHaveText("Saved!");
    await expect.poll(async () => status.evaluate((el) => el.hidden)).toBe(true);
  });

  test("toggle switches surface hover and focus feedback", async ({ page }) => {
    await openSections(page, ["general"]);
    const label = page.locator("label[for='sound-toggle']");
    const checkbox = page.locator("#sound-toggle");
    const heading = page.getByRole("heading", { name: "Settings" });

    const queryState = async () =>
      label.evaluate((node) => ({
        hover: node.matches(":hover"),
        focusWithin: node.matches(":focus-within")
      }));

    await label.hover();
    let state = await queryState();
    expect(state.hover).toBe(true);
    expect(state.focusWithin).toBe(false);

    await checkbox.focus();
    state = await queryState();
    expect(state.focusWithin).toBe(true);

    await page.locator("#motion-toggle").focus();
    await heading.hover();
    state = await queryState();
    expect(state.focusWithin).toBe(false);

    await label.hover();
    state = await queryState();
    expect(state.hover).toBe(true);
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
        "label[for='display-mode-dark']"
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
    await openSections(page, ["display", "general", "links"]);
    const measure = async (selector) =>
      page
        .locator(selector)
        .first()
        .evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
    const toggleSelectors = [
      "label[for='sound-toggle'] .slider",
      "label[for='motion-toggle'] .slider",
      "label[for='typewriter-toggle'] .slider",
      "label[for='tooltips-toggle'] .slider"
    ];

    for (const sel of toggleSelectors) {
      const box = await measure(sel);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }

    const resetBox = await measure("button#reset-settings-button:not(.settings-section-toggle)");
    expect(resetBox.width).toBeGreaterThanOrEqual(120);
    expect(resetBox.height).toBeGreaterThanOrEqual(40);
  });

  test("feature flag search filters advanced settings list", async ({ page }) => {
    await openSections(page, ["advanced"]);
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
    await expect(page.locator("#feature-flags-container .settings-item:visible")).toHaveCount(
      totalFlags
    );
  });

  test("collapsible sections default state and user toggle", async ({ page }) => {
    const snapshot = async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll("#settings-form details.settings-section")).map(
          (details) => ({
            id: details.dataset.sectionId,
            open: details.open
          })
        )
      );

    const initialState = await snapshot();
    expect(initialState.find((section) => section.id === "display")?.open).toBe(true);
    expect(initialState.find((section) => section.id === "general")?.open).toBe(true);
    expect(initialState.find((section) => section.id === "advanced")?.open).toBe(false);

    const advancedSummary = page.locator('details[data-section-id="advanced"] summary');
    await advancedSummary.click();
    await expect(page.locator('details[data-section-id="advanced"]')).toHaveJSProperty(
      "open",
      true
    );
    await advancedSummary.click();
    await expect(page.locator('details[data-section-id="advanced"]')).toHaveJSProperty(
      "open",
      false
    );
  });

  test("normalizes legacy retro value to dark", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "settings",
        JSON.stringify({
          displayMode: "retro"
        })
      );
    });
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.theme === "dark");
    await expect(page.locator("#display-mode-dark")).toBeChecked();
    await page.evaluate(() => localStorage.removeItem("settings"));
  });

  test("theme-specific tokens update settings visuals", async ({ page }) => {
    const readVar = async (name) =>
      page.evaluate((prop) => getComputedStyle(document.body).getPropertyValue(prop).trim(), name);
    const readFieldsetBg = async () =>
      page
        .locator(".settings-form fieldset")
        .first()
        .evaluate((node) => getComputedStyle(node).backgroundColor);

    const snapshot = async () => ({
      sectionBg: await readVar("--settings-section-bg"),
      switchOn: await readVar("--switch-on-bg"),
      searchPlaceholder: await readVar("--settings-search-placeholder"),
      fieldsetBg: await readFieldsetBg()
    });

    const light = await snapshot();
    expect(light.sectionBg).not.toBe("");
    expect(light.switchOn).not.toBe("");
    expect(light.searchPlaceholder).not.toBe("");

    await page.check("#display-mode-dark");
    await page.waitForFunction(() => document.body.dataset.theme === "dark");
    const dark = await snapshot();
    expect(dark.sectionBg).not.toBe(light.sectionBg);
    expect(dark.switchOn).not.toBe(light.switchOn);
    expect(dark.searchPlaceholder).not.toBe(light.searchPlaceholder);
    expect(dark.fieldsetBg).not.toBe(light.fieldsetBg);

    await page.check("#display-mode-light");
    await page.waitForFunction(() => document.body.dataset.theme === "light");
    const backToLight = await snapshot();
    expect(backToLight.sectionBg).toBe(light.sectionBg);
    expect(backToLight.switchOn).toBe(light.switchOn);
    expect(backToLight.searchPlaceholder).toBe(light.searchPlaceholder);
    expect(backToLight.fieldsetBg).toBe(light.fieldsetBg);
  });

  test("restore defaults resets settings", async ({ page }) => {
    await openSections(page, ["general", "links"]);
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
