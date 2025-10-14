import { test, expect } from "./fixtures/commonSetup.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const VERBOSE_LOG_SELECTOR = "#cli-verbose-log";

async function ensureVerboseLogVisible(page) {
  const verboseToggle = page.locator("#verbose-toggle");
  if ((await verboseToggle.count()) > 0) {
    const isChecked = await verboseToggle.isChecked();
    if (!isChecked) {
      await verboseToggle.check();
    }
    const verboseSection = page.locator("#cli-verbose-section");
    if ((await verboseSection.count()) > 0) {
      await expect(verboseSection).toBeVisible();
    }
  }
}

function getVerbosePreview(entries) {
  if (typeof entries === "string") {
    return entries.slice(0, 80);
  }

  if (Array.isArray(entries) && entries.length > 0) {
    const firstEntry = entries[0];
    if (typeof firstEntry === "string") {
      return firstEntry.slice(0, 80);
    }

    if (firstEntry && typeof firstEntry.to === "string") {
      return firstEntry.to.slice(0, 80);
    }
  }

  return null;
}

async function appendVerboseEntries(page, entries) {
  const payload = Array.isArray(entries) ? entries : [entries];
  await page.evaluate(async (logs) => {
    const dispatch =
      window.__TEST_API?.state?.dispatchBattleEvent?.bind(window.__TEST_API.state) || null;
    const emitter = typeof window.emitBattleEvent === "function" ? window.emitBattleEvent : null;

    for (const entry of logs) {
      const detail =
        typeof entry === "string"
          ? { from: null, to: entry }
          : { from: entry?.from ?? null, to: entry?.to ?? "" };
      const failures = [];

      if (dispatch) {
        try {
          const result = await dispatch("battleStateChange", detail);
          if (result !== false) {
            continue;
          }
          failures.push("dispatchBattleEvent returned false");
        } catch (error) {
          const message = error?.message ?? String(error);
          failures.push(`dispatchBattleEvent error: ${message}`);
        }
      } else {
        failures.push("dispatchBattleEvent unavailable");
      }

      if (emitter) {
        try {
          emitter("battleStateChange", detail);
          continue;
        } catch (error) {
          const message = error?.message ?? String(error);
          failures.push(`emitBattleEvent error: ${message}`);
        }
      } else {
        failures.push("emitBattleEvent unavailable");
      }

      throw new Error(`Failed to append verbose entry. ${failures.join("; ")}`);
    }
  }, payload);
}

/**
 * @pseudocode
 * @param {import('@playwright/test').Page} page
 * @param {Array<{from?: string|null, to: string}>|Array<string>|{from?: string|null, to: string}|string} entries
 * @param {{ expectText?: string, helpersTimeout?: number }} [options]
 * @param {number} [options.helpersTimeout=5000] Maximum time in milliseconds to wait for the Test API helpers to become ready before failing.
 */
async function setupCliVerboseTest(page, entries, options = {}) {
  const { expectText, helpersTimeout = 5000 } = options;

  await waitForTestApi(page);
  const helperStatus = await page.evaluate(
    async ({ waitTimeout }) => {
      const initApi = window.__TEST_API?.init;
      const stateApi = window.__TEST_API?.state;

      if (typeof initApi?.waitForBattleReady === "function") {
        const ready = await initApi.waitForBattleReady(waitTimeout);
        if (ready !== true) {
          return { ready: false, reason: "battle-ready-timeout" };
        }
      }

      const hasDispatch = typeof stateApi?.dispatchBattleEvent === "function";
      const hasEmit = typeof window.emitBattleEvent === "function";

      return {
        ready: hasDispatch || hasEmit,
        hasDispatch,
        hasEmit
      };
    },
    { waitTimeout: helpersTimeout }
  );

  if (!helperStatus?.ready) {
    const issues = [];
    if (!helperStatus) {
      issues.push("test API unavailable");
    } else {
      if (helperStatus.reason === "battle-ready-timeout") {
        issues.push("battle init timeout");
      }
      if (helperStatus.hasDispatch !== true) {
        issues.push("dispatch helper missing");
      }
      if (helperStatus.hasEmit !== true) {
        issues.push("emit helper missing");
      }
      if (issues.length === 0) {
        issues.push("helpers unavailable for unknown reason");
      }
    }

    throw new Error(`Battle event helpers not ready: ${issues.join(", ") || "unknown error"}`);
  }
  await page.waitForSelector(VERBOSE_LOG_SELECTOR, { state: "attached" });
  await ensureVerboseLogVisible(page);
  await expect(page.locator(VERBOSE_LOG_SELECTOR)).toBeVisible();
  await appendVerboseEntries(page, entries);

  const previewText = expectText ?? getVerbosePreview(entries);
  if (previewText) {
    await expect(page.locator(VERBOSE_LOG_SELECTOR)).toContainText(previewText, {
      timeout: 5000
    });
  }
}

test.describe("CLI Layout and Scrolling", () => {
  test.describe("Desktop Layout", () => {
    test("CLI interface fits within viewport without horizontal scroll", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 1024, height: 768 });

      // Check no horizontal scroll
      const viewportSize = page.viewportSize();
      const bodyBox = await page.locator("body").boundingBox();
      if (viewportSize && bodyBox) {
        expect(bodyBox.width).toBeLessThanOrEqual(viewportSize.width + 10);
      }

      // Verify CLI interface elements are properly contained
      const cliContainer = page.locator("#cli-container, .cli-container, main");
      await expect(cliContainer).toBeVisible();

      // Check if CLI content areas are accessible
      const cliContent = page.locator("#cli-content, .cli-content, .terminal");
      if ((await cliContent.count()) > 0) {
        await expect(cliContent).toBeVisible();
      }
    });

    test("CLI handles long content with proper scrolling", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 1024, height: 768 });

      const transcriptEntries = Array.from({ length: 50 }, (_, i) => ({
        from: `state-${i}`,
        to: `Test line ${i + 1}: This is a long line of text to test horizontal scrolling behavior and content wrapping.`
      }));
      await setupCliVerboseTest(page, transcriptEntries);

      // Check that content is scrollable vertically but not horizontally
      const scroller = page.locator("html");
      const viewportSize = page.viewportSize();
      const scrollerBox = await scroller.boundingBox();
      if (viewportSize && scrollerBox) {
        expect(scrollerBox.width).toBeLessThanOrEqual(viewportSize.width + 10);
      const getScrollInfo = async () =>
        scroller.evaluate((el) => {
          const scrollingElement = el.ownerDocument?.scrollingElement ?? el;
          return {
            scrollWidth: scrollingElement.scrollWidth,
            clientWidth: scrollingElement.clientWidth,
            scrollHeight: scrollingElement.scrollHeight,
            clientHeight: scrollingElement.clientHeight,
            scrollTop: scrollingElement.scrollTop ?? 0
          };
        });
      const scrollInfo = await getScrollInfo();

      // Should not have horizontal scroll
      expect(scrollInfo.scrollWidth).toBeLessThanOrEqual(scrollInfo.clientWidth + 10);

      // Should have vertical scroll if content is long
      if (scrollInfo.scrollHeight > scrollInfo.clientHeight) {
        const initialScrollTop = scrollInfo.scrollTop;
        await page.mouse.wheel(0, 400);
        await expect
          .poll(
            async () => {
              const currentInfo = await getScrollInfo();
              return currentInfo.scrollTop;
            },
            { timeout: 5000 }
          )
          .toBeGreaterThan(initialScrollTop);
      }

      const initialScrollTop = await scroller.evaluate((el) => {
        const scrollingElement = el.ownerDocument?.scrollingElement ?? el;
        return scrollingElement.scrollTop ?? 0;
      });

      await scroller.hover();
      await page.mouse.wheel(0, 400);
      await expect
        .poll(async () => {
          const currentScrollTop = await scroller.evaluate((el) => {
            const scrollingElement = el.ownerDocument?.scrollingElement ?? el;
            return scrollingElement.scrollTop ?? 0;
          });
          return currentScrollTop;
        }, { timeout: 5000 })
        .toBeGreaterThan(initialScrollTop);
    });
  });

  test.describe("Content Overflow Handling", () => {
    test("handles very long lines gracefully", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 800, height: 600 });

      const longLine = "A".repeat(1000);
      await setupCliVerboseTest(page, longLine, { expectText: longLine.slice(0, 40) });

      // Check that long lines don't break layout
      const verboseLog = page.locator(VERBOSE_LOG_SELECTOR);
      const verboseBox = await verboseLog.boundingBox();
      const viewport = page.viewportSize();
      if (verboseBox && viewport) {
        const layoutRightEdge = verboseBox.x + verboseBox.width;
        expect(layoutRightEdge).toBeLessThanOrEqual(viewport.width + 50);
      }
    });

    test("maintains usability with multiple content sections", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 1024, height: 768 });

      const sectionEntries = Array.from({ length: 10 }, (_, i) => ({
        from: `state-${i}`,
        to: `Section ${i + 1}: This is test content for section ${i + 1}.`
      }));
      await setupCliVerboseTest(page, sectionEntries);

      const transcriptText = await page.locator(VERBOSE_LOG_SELECTOR).innerText();
      const transcriptLines = transcriptText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      expect(transcriptLines.length).toBeGreaterThanOrEqual(10);

      const sections = page.locator(".cli-block");
      let layoutIssues = 0;
      const sectionCount = await sections.count();
      for (let index = 0; index < sectionCount; index += 1) {
        const section = sections.nth(index);
        if (!(await section.isVisible())) {
          continue;
        }
        const sectionBox = await section.boundingBox();
        if (!sectionBox || sectionBox.width <= 0 || sectionBox.height <= 0) {
          layoutIssues += 1;
        }
      }

      expect(layoutIssues).toBe(0);
    });
  });
});
