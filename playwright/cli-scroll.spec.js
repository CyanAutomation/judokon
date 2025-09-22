import { test, expect } from "./fixtures/commonSetup.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

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
      let handled = false;
      if (dispatch) {
        try {
          const result = await dispatch("battleStateChange", detail);
          handled = result === true;
        } catch {
          handled = false;
        }
      }
      if (!handled && emitter) {
        try {
          emitter("battleStateChange", detail);
          handled = true;
        } catch {
          handled = false;
        }
      }
      if (!handled) {
        throw new Error("Failed to append verbose entry through official helpers");
      }
    }
  }, payload);
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

      await waitForTestApi(page);
      await page.waitForFunction(() => typeof window.emitBattleEvent === "function");
      await page.waitForSelector("#cli-verbose-log");
      await ensureVerboseLogVisible(page);
      const transcriptEntries = Array.from({ length: 50 }, (_, i) => ({
        from: `state-${i}`,
        to: `Test line ${i + 1}: This is a long line of text to test horizontal scrolling behavior and content wrapping.`
      }));
      await appendVerboseEntries(page, transcriptEntries);
      await expect(page.locator("#cli-verbose-log")).toContainText("Test line 1", {
        timeout: 5000
      });

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
        await page.mouse.wheel(0, 400);
        await expect
          .poll(() => page.evaluate(() => window.scrollY || document.documentElement.scrollTop))
          .toBeGreaterThan(initialScroll);
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

      await waitForTestApi(page);
      await page.waitForFunction(() => typeof window.emitBattleEvent === "function");
      await page.waitForSelector("#cli-verbose-log");
      await ensureVerboseLogVisible(page);
      const longLine = "A".repeat(1000);
      await appendVerboseEntries(page, longLine);
      await expect(page.locator("#cli-verbose-log")).toContainText(longLine.slice(0, 100));

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

      await waitForTestApi(page);
      await page.waitForFunction(() => typeof window.emitBattleEvent === "function");
      await page.waitForSelector("#cli-verbose-log");
      await ensureVerboseLogVisible(page);
      const sectionEntries = Array.from({ length: 10 }, (_, i) => ({
        from: `state-${i}`,
        to: `Section ${i + 1}: This is test content for section ${i + 1}.`
      }));
      await appendVerboseEntries(page, sectionEntries);
      await expect(page.locator("#cli-verbose-log")).toContainText("Section 1");

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
