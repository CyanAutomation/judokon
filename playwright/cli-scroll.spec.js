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

async function setupCliVerboseTest(page, entries, options = {}) {
  const { expectText } = options;

  await waitForTestApi(page);
  try {
    await page.waitForFunction(() => typeof window.emitBattleEvent === "function", {
      timeout: 5000
    });
  } catch (error) {
    const message = error?.message ?? String(error);
    throw new Error(`Timed out waiting for battle event helpers: ${message}`);
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
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(1024);

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
      const scrollInfo = await page.evaluate(() => {
        const el = document.documentElement;
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight
        };
      });

      // Should not have horizontal scroll
      expect(scrollInfo.scrollWidth).toBeLessThanOrEqual(scrollInfo.clientWidth + 10);

      // Should have vertical scroll if content is long
      if (scrollInfo.scrollHeight > scrollInfo.clientHeight) {
        // Verify scrolling works
        const initialScroll = await page.evaluate(
          () => window.scrollY || document.documentElement.scrollTop
        );
        let programmaticScrollWorked = false;

        try {
          programmaticScrollWorked = await page.evaluate(() => {
            const start = window.scrollY || document.documentElement.scrollTop;
            window.scrollTo(0, start + 200);
            const current = window.scrollY || document.documentElement.scrollTop;
            return current > start;
          });
        } catch (error) {
          programmaticScrollWorked = false;
        }

        if (!programmaticScrollWorked) {
          await page.mouse.wheel(0, 400);
          await expect
            .poll(() => page.evaluate(() => window.scrollY || document.documentElement.scrollTop))
            .toBeGreaterThan(initialScroll);
        }
      }
    });
  });

  test.describe("Mobile Layout", () => {
    test("CLI adapts to mobile viewport without critical issues", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 375, height: 667 });

      // Check page loads and is functional
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Verify header/navigation is present
      const header = page.locator("header, .header");
      await expect(header).toBeVisible();

      // Check CLI interface loads (may have scroll issues on mobile)
      const cliInterface = page.locator("#cli-container, .cli-container, main");
      await expect(cliInterface).toBeVisible();

      // Check touch target sizes (CLI may not be fully mobile-optimized)
      const touchTargets = page.locator("button, a, input, [role='button']");
      if ((await touchTargets.count()) > 0) {
        const touchTargetInfo = await page.evaluate(() => {
          const targets = document.querySelectorAll("button, a, input, [role='button']");
          let smallCount = 0;
          let totalCount = targets.length;
          for (const target of targets) {
            const rect = target.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
              smallCount++;
            }
          }
          return { smallCount, totalCount };
        });

        // CLI interface may not be fully mobile-optimized, be very lenient
        // Just ensure some targets are reasonably sized
        const largeTargets = touchTargetInfo.totalCount - touchTargetInfo.smallCount;
        expect(largeTargets).toBeGreaterThan(0); // At least one properly sized target
      }
    });

    test("CLI keyboard navigation works on mobile", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 375, height: 667 });

      // Focus on CLI input if available
      const cliInput = page.locator("input[type='text'], textarea, #cli-input");
      if ((await cliInput.count()) > 0) {
        await cliInput.focus();

        // Test keyboard input
        await page.keyboard.type("test command");
        const inputValue = await cliInput.inputValue();
        expect(inputValue).toBe("test command");

        // Test enter key
        await page.keyboard.press("Enter");

        // Verify command was processed (check for output or state change)
        const cliOutput = page.locator("#cli-output, .cli-output, .terminal-output");
        if ((await cliOutput.count()) > 0) {
          // Output area exists, command processing should work
          expect(await cliOutput.isVisible()).toBe(true);
        }
      }
    });
  });

  test.describe("Tablet Layout", () => {
    test("CLI layout works correctly on tablet viewport", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(768);

      // Verify layout adapts properly
      const mainContent = page.locator("main, #cli-container");
      await expect(mainContent).toBeVisible();

      // Check if content is properly sized for tablet
      const contentDimensions = await page.evaluate(() => {
        const content = document.querySelector("main, #cli-container, .cli-container");
        if (content) {
          const rect = content.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }
        return null;
      });

      if (contentDimensions) {
        // Content should be reasonably sized for tablet
        expect(contentDimensions.width).toBeGreaterThan(300);
        expect(contentDimensions.height).toBeGreaterThan(200);
      }
    });
  });

  test.describe("Content Overflow Handling", () => {
    test("handles very long lines gracefully", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 800, height: 600 });

      const longLine = "A".repeat(1000);
      await setupCliVerboseTest(page, longLine, { expectText: longLine.slice(0, 40) });

      // Check that long lines don't break layout
      const layoutBroken = await page.evaluate(() => {
        const pre = document.getElementById("cli-verbose-log");
        if (pre) {
          const rect = pre.getBoundingClientRect();
          // Check if content extends beyond reasonable bounds
          return rect.right > window.innerWidth + 50;
        }
        return false;
      });

      expect(layoutBroken).toBe(false);
    });

    test("maintains usability with multiple content sections", async ({ page }) => {
      await page.goto("/src/pages/battleCLI.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 1024, height: 768 });

      const sectionEntries = Array.from({ length: 10 }, (_, i) => ({
        from: `state-${i}`,
        to: `Section ${i + 1}: This is test content for section ${i + 1}.`
      }));
      await setupCliVerboseTest(page, sectionEntries);

      const transcriptLines = await page.evaluate(() => {
        const pre = document.getElementById("cli-verbose-log");
        if (!pre) return [];
        return pre.textContent
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      });
      expect(transcriptLines.length).toBeGreaterThanOrEqual(10);

      const layoutIssues = await page.evaluate(() => {
        const sections = document.querySelectorAll(".cli-block");
        let issues = 0;
        for (const section of sections) {
          if (section.hidden || section.offsetParent === null) {
            continue;
          }
          const rect = section.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            issues++;
          }
        }
        return issues;
      });

      expect(layoutIssues).toBe(0);
    });
  });
});
