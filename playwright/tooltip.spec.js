import fs from "node:fs";
import { test, expect } from "./fixtures/commonSetup.js";

const TOOLTIP_DATA = JSON.parse(fs.readFileSync("src/data/tooltips.json", "utf8"));

function flattenTooltips(obj, prefix = "") {
  if (obj === null || typeof obj !== "object") return {};
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const id = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flattenTooltips(value, id));
    } else {
      acc[id] = value;
    }
    return acc;
  }, {});
}

const TOOLTIP_MAP = flattenTooltips(TOOLTIP_DATA);

function tooltipLines(id) {
  const raw = TOOLTIP_MAP[id] || "";
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function loadBrowsePage(page) {
  await page.goto("/src/pages/browseJudoka.html");
  await page.waitForLoadState("domcontentloaded");
  const tooltip = page.locator(".tooltip");
  await tooltip.waitFor({ state: "attached" });
  return tooltip;
}

test.describe("Tooltip behavior", () => {
  test("shows tooltip on hover and wires aria-describedby", async ({ page }) => {
    const tooltip = await loadBrowsePage(page);
    const layoutToggle = page.getByTestId("layout-mode-toggle");
    await expect(layoutToggle).toBeVisible();

    await layoutToggle.hover();

    const tooltipId = (await tooltip.getAttribute("id")) ?? "";
    expect(tooltipId).not.toEqual("");
    await expect(tooltip).toHaveAttribute("role", "tooltip");
    for (const line of tooltipLines("ui.toggleLayout")) {
      await expect(tooltip).toContainText(line);
    }

    const describedBy = await layoutToggle.getAttribute("aria-describedby");
    expect(describedBy ?? "").toContain(tooltipId);
    await expect(layoutToggle).toHaveAttribute("aria-expanded", "true");

    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
    const describedByAfter = await layoutToggle.getAttribute("aria-describedby");
    expect(describedByAfter ?? "").not.toContain(tooltipId);
    await expect(layoutToggle).not.toHaveAttribute("aria-expanded", "true");
  });

  test("updates tooltip content and aria links on focus changes", async ({ page }) => {
    const tooltip = await loadBrowsePage(page);
    const tooltipId = (await tooltip.getAttribute("id")) ?? "tooltip";
    const layoutToggle = page.getByTestId("layout-mode-toggle");
    const countryToggle = page.getByTestId("country-toggle");
    const clearFilter = page.getByTestId("clear-filter");

    await layoutToggle.focus();
    await expect(tooltip).toBeVisible();
    for (const line of tooltipLines("ui.toggleLayout")) {
      await expect(tooltip).toContainText(line);
    }
    expect((await layoutToggle.getAttribute("aria-describedby")) ?? "").toContain(tooltipId);

    await countryToggle.focus();
    await expect(tooltip).toBeVisible();
    for (const line of tooltipLines("ui.countryFilter")) {
      await expect(tooltip).toContainText(line);
    }
    expect((await countryToggle.getAttribute("aria-describedby")) ?? "").toContain(tooltipId);
    expect((await layoutToggle.getAttribute("aria-describedby")) ?? "").not.toContain(tooltipId);

    await countryToggle.click();
    await expect(clearFilter).toBeVisible();
    await clearFilter.focus();
    for (const line of tooltipLines("ui.clearFilter")) {
      await expect(tooltip).toContainText(line);
    }
    expect((await clearFilter.getAttribute("aria-describedby")) ?? "").toContain(tooltipId);

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await expect(tooltip).toBeHidden();
    expect((await clearFilter.getAttribute("aria-describedby")) ?? "").not.toContain(tooltipId);
  });
});
