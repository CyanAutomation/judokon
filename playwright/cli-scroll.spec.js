import { test, expect } from "./fixtures/commonSetup.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const CLI_CONTAINER_SELECTOR = '[data-test="cli-root"]';
const VERBOSE_LOG_SELECTOR = "#cli-verbose-log";

async function enableVerboseLogging(page) {
  const verboseToggle = page.locator("#verbose-toggle");
  await expect(verboseToggle).toBeVisible();
  if (!(await verboseToggle.isChecked())) {
    await verboseToggle.check();
  }
  await expect(page.locator("#cli-verbose-section")).toBeVisible();
}

async function appendVerboseEntries(page, entries) {
  await page.evaluate(async (logs) => {
    const dispatch = window.__TEST_API?.state?.dispatchBattleEvent;
    if (typeof dispatch !== "function") {
      throw new Error("dispatchBattleEvent unavailable");
    }
    for (const entry of logs) {
      await dispatch("battleStateChange", { from: entry.from ?? null, to: entry.to ?? "" });
    }
  }, entries);
}

test("CLI verbose log scrolls vertically without horizontal overflow", async ({ page }) => {
  await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1024, height: 768 });

  await waitForTestApi(page);
  await expect(page.locator(CLI_CONTAINER_SELECTOR)).toBeVisible();
  await enableVerboseLogging(page);

  const transcriptEntries = Array.from({ length: 80 }, (_, i) => ({
    from: `state-${i}`,
    to: `Log entry ${i + 1}: Testing verbose log scrolling with deterministic overflow.`
  }));
  await appendVerboseEntries(page, transcriptEntries);
  await expect(page.locator(VERBOSE_LOG_SELECTOR)).toContainText("Log entry 1");

  const scroller = page.locator(VERBOSE_LOG_SELECTOR);
  const scrollMetrics = await scroller.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight
  }));

  expect(scrollMetrics.clientWidth + 10).toBeGreaterThanOrEqual(scrollMetrics.scrollWidth);
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

  const getScrollTop = () => scroller.evaluate((el) => el.scrollTop ?? 0);
  const initialScrollTop = await getScrollTop();

  await scroller.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(getScrollTop, { timeout: 5000 }).toBeGreaterThan(initialScrollTop);
});
