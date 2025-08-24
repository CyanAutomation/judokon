import { test, expect } from "./fixtures/commonSetup.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const JUDOKA = {
  id: 1,
  firstname: "John",
  surname: "Doe",
  country: "USA",
  countryCode: "us",
  stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 },
  weightClass: "-100kg",
  signatureMoveId: 1,
  rarity: "common",
  gender: "male"
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createInspectorPanelPath = path.resolve(__dirname, "../src/helpers/inspector/createInspectorPanel.js");
const mountInspectorPanelPath = path.resolve(__dirname, "../tests/helpers/mountInspectorPanel.js");

const createInspectorPanelScript = fs.readFileSync(createInspectorPanelPath, "utf8")
  .replace("export function createInspectorPanel", "function createInspectorPanel");

const mountInspectorPanelScript = fs.readFileSync(mountInspectorPanelPath, "utf8")
  .replace('import { createInspectorPanel } from "../../src/helpers/inspector/createInspectorPanel.js";', '')
  .replace("export function mountInspectorPanel", "function mountInspectorPanel");

const initScript = createInspectorPanelScript + "\n" + mountInspectorPanelScript;

test.describe.parallel("Card inspector accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent("<html><body></body></html>");
    await page.addScriptTag({ content: initScript });
  });

  test("summary keyboard support and ARIA state", async ({ page }) => {
    await page.evaluate((judoka) => {
      window.mountInspectorPanel(judoka);
    }, JUDOKA);

    const panel = page.locator(".debug-panel");
    await expect(panel).toHaveAttribute("aria-label", "Inspector panel");

    const summary = page.locator("summary");

    await page.keyboard.press("Tab");
    await expect(summary).toBeFocused();

    await summary.press("Enter");
    await expect(summary).toHaveAttribute("aria-expanded", "true");

    await summary.press(" ");
    await expect(summary).toHaveAttribute("aria-expanded", "false");
  });

  test("announces invalid card data on JSON failure", async ({ page }) => {
    await page.evaluate(() => {
      const badJudoka = {
        id: 2,
        firstname: "Bad",
        surname: "Data",
        country: "USA",
        countryCode: "us",
        stats: {
          power: 1,
          speed: 1,
          technique: 1,
          kumikata: 1,
          newaza: 1
        },
        weightClass: "-100kg",
        signatureMoveId: 1,
        rarity: "common",
        gender: "male",
        extra: 1n
      };
      window.mountInspectorPanel(badJudoka);
    });

    await expect(page.getByText("Invalid card data")).toBeVisible();
  });
});