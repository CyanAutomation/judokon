import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/gameModes.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gameModes.json" })
    );
    await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
  });

  test("page loads", async ({ page }) => {
    await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  });

  test("mode toggle visible", async ({ page }) => {
    await page.getByLabel(/Classic Battle/i).waitFor();
    await expect(page.getByLabel(/Classic Battle/i)).toBeVisible();
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("img", { name: "JU-DO-KON! Logo" })).toBeVisible();
    await expect(page.getByLabel(/sound/i)).toBeVisible();
    await expect(page.getByLabel(/full navigation map/i)).toBeVisible();
    await expect(page.getByLabel(/motion effects/i)).toBeVisible();
    await expect(page.getByLabel(/display mode/i)).toBeVisible();
  });

  test("controls expose correct labels and follow tab order", async ({ page }) => {
    await page.getByLabel(/Classic Battle/i).waitFor();

    const gameModes = await page.evaluate(async () => {
      const res = await fetch("/tests/fixtures/gameModes.json");
      return res.json();
    });

    const sortedNames = gameModes
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((m) => m.name);

    const expectedLabels = [
      "Display Mode",
      "Sound",
      "Full Navigation Map",
      "Motion Effects",
      ...sortedNames
    ];

    await expect(page.locator("#sound-toggle")).toHaveAttribute("aria-label", "Sound");
    await expect(page.locator("#navmap-toggle")).toHaveAttribute(
      "aria-label",
      "Full Navigation Map"
    );
    await expect(page.locator("#motion-toggle")).toHaveAttribute("aria-label", "Motion Effects");

    for (const name of sortedNames) {
      await expect(page.getByLabel(name)).toHaveAttribute("aria-label", name);
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
      activeLabels.push(label);
      if (i < expectedLabels.length - 1) {
        await page.keyboard.press("Tab");
      }
    }

    expect(activeLabels).toEqual(expectedLabels);
  });
});
