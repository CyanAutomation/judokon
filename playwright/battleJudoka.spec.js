import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";
import { readFileSync } from "node:fs";

const classicBattleStates = JSON.parse(
  readFileSync(new URL("../src/data/classicBattleStates.json", import.meta.url))
);

test.describe.parallel("Battle Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.42;
    });
    await page.goto("/src/pages/battleJudoka.html");
  });

  test("page loads and nav visible", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
  });

  test("navigation links work", async ({ page }) => {
    await page.getByTestId(NAV_RANDOM_JUDOKA).click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
    await page.goBack({ waitUntil: "load" });
    await page.getByTestId(NAV_CLASSIC_BATTLE).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("narrow viewport screenshot and status aria attributes", async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 800 });

    const axTree = await page.accessibility.snapshot({ interestingOnly: false });

    const collectStatusNodes = (node) => {
      if (!node) return [];
      const matches = node.role === "status" ? [node] : [];
      return node.children ? matches.concat(node.children.flatMap(collectStatusNodes)) : matches;
    };

    const statusNodes = collectStatusNodes(axTree);
    expect(statusNodes.length).toBeGreaterThan(0);

    const ariaLiveCount = await page.locator('[role="status"][aria-live]').count();
    expect(ariaLiveCount).toBeGreaterThan(0);

    const expectedIds = classicBattleStates
      .filter((s) => s.id < 90)
      .sort((a, b) => a.id - b.id)
      .map((s) => String(s.id));
    const ids = await page.$$eval("#battle-state-progress li", (lis) =>
      lis.map((li) => li.textContent.trim())
    );
    expect(ids).toEqual(expectedIds);

    await expect(page).toHaveScreenshot("battleJudoka-narrow.png", {
      mask: [page.locator("#battle-state-progress")]
    });
  });
});
