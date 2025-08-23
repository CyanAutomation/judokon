import { test, expect } from "./fixtures/commonSetup.js";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
const helperPath = path.resolve(__dirname, "../tests/helpers/mountInspectorPanel.js");
const helperUrl = pathToFileURL(helperPath).href;

test.describe.parallel("Card inspector accessibility", () => {
  test("summary keyboard support and ARIA state", async ({ page }) => {
    await page.setContent("<html><body></body></html>");
    await page.evaluate(
      async ({ judoka, helperUrl }) => {
        await import(helperUrl);
        window.mountInspectorPanel(judoka);
      },
      { judoka: JUDOKA, helperUrl }
    );

    const panel = page.locator(".debug-panel");
    await expect(panel).toHaveAttribute("aria-label", "Inspector panel");

    const summary = page.locator("summary");

    await page.keyboard.press("Tab");
    await expect(summary).toBeFocused();

    await summary.press("Enter");
    await expect(summary).toHaveJSProperty("ariaExpanded", "true");

    await summary.press(" ");
    await expect(summary).toHaveJSProperty("ariaExpanded", "false");
  });

  test("announces invalid card data on JSON failure", async ({ page }) => {
    await page.setContent("<html><body></body></html>");
    await page.evaluate(
      async ({ helperUrl }) => {
        await import(helperUrl);
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
      },
      { helperUrl }
    );

    await expect(page.getByText("Invalid card data")).toBeVisible();
  });
});
