import { test, expect } from "./fixtures/commonSetup.js";

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

test.describe.parallel("Card inspector accessibility", () => {
  test("summary keyboard support and ARIA state", async ({ page }) => {
    await page.setContent("<html><body></body></html>");
    const { createInspectorPanel } = await import(
      "../src/helpers/inspector/createInspectorPanel.js"
    );
    const func = createInspectorPanel.toString();
    await page.evaluate(
      ({ judoka, funcStr }) => {
        const createInspectorPanel = eval(`(${funcStr})`);
        const container = document.createElement("div");
        const panel = createInspectorPanel(container, judoka);
        container.appendChild(panel);
        document.body.appendChild(container);
      },
      { judoka: JUDOKA, funcStr: func }
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
    const { createInspectorPanel } = await import(
      "../src/helpers/inspector/createInspectorPanel.js"
    );
    const func = createInspectorPanel.toString();
    await page.evaluate(
      ({ funcStr }) => {
        const createInspectorPanel = eval(`(${funcStr})`);
        const container = document.createElement("div");
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
        const result = createInspectorPanel(container, badJudoka);
        container.appendChild(result);
        document.body.appendChild(container);
      },
      { funcStr: func }
    );

    await expect(page.getByText("Invalid card data")).toBeVisible();
  });
});
