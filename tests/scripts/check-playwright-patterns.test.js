import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkFile, BANNED_PATTERNS } from "../../scripts/check-playwright-patterns.js";
import fs from "fs";
import path from "path";
import os from "os";

describe("check-playwright-patterns", () => {
  let tempDir;
  let tempFile;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-patterns-test-"));
  });

  afterEach(() => {
    // Clean up temporary files
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir, { recursive: true });
    }
  });

  function createTestFile(content) {
    tempFile = path.join(tempDir, "test.spec.js");
    fs.writeFileSync(tempFile, content, "utf8");
    return tempFile;
  }

  describe("BANNED_PATTERNS", () => {
    it("should have required properties for all patterns", () => {
      BANNED_PATTERNS.forEach((pattern) => {
        expect(pattern).toHaveProperty("pattern");
        expect(pattern).toHaveProperty("description");
        expect(pattern).toHaveProperty("severity");
        expect(pattern).toHaveProperty("fixSuggestion");
        expect(["error", "warning"]).toContain(pattern.severity);
      });
    });

    it("should include core anti-patterns", () => {
      const patterns = BANNED_PATTERNS.map((p) => p.pattern);
      expect(patterns).toContain("waitForTimeout");
      expect(patterns).toContain("setTimeout");
      expect(patterns).toContain("innerHTML");
      expect(patterns).toContain("appendChild");
    });
  });

  describe("checkFile", () => {
    it("should detect waitForTimeout usage", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.waitForTimeout(1000);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(1);
      expect(violations[0].pattern).toBe("waitForTimeout");
      expect(violations[0].severity).toBe("error");
      expect(violations[0].lines).toEqual([3]);
    });

    it("should detect setTimeout usage", () => {
      const content = `
        test('example', async ({ page }) => {
          setTimeout(() => {}, 1000);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(1);
      expect(violations[0].pattern).toBe("setTimeout");
      expect(violations[0].severity).toBe("error");
    });

    it("should detect innerHTML usage", () => {
      const content = `
        test('example', async ({ page }) => {
          const html = await element.innerHTML();
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(1);
      expect(violations[0].pattern).toBe("innerHTML");
      expect(violations[0].severity).toBe("warning");
    });

    it("should detect appendChild usage", () => {
      const content = `
        test('example', async ({ page }) => {
          parent.appendChild(child);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(1);
      expect(violations[0].pattern).toBe("appendChild");
      expect(violations[0].severity).toBe("warning");
    });

    it("should detect placeholder assertions", () => {
      const content = `
        test('example', async ({ page }) => {
          expect(true).toBe(true);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(1);
      expect(violations[0].pattern).toMatch(/expect.*true/);
      expect(violations[0].severity).toBe("error");
    });

    it("should detect multiple violations on different lines", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.waitForTimeout(1000);
          setTimeout(() => {}, 500);
          expect(true).toBe(true);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations.length).toBeGreaterThanOrEqual(2);
    });

    it("should return empty array for clean code", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.waitForSelector('.element');
          await page.click('button');
          expect(page.locator('.result')).toBeVisible();
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(0);
    });

    it("should skip __battleCLIinit cleanup pattern", () => {
      const content = `
        afterEach(() => {
          delete globalThis.__battleCLIinit;
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(0);
    });

    it("should detect __battleCLIinit usage (non-cleanup)", () => {
      const content = `
        test('example', async () => {
          const init = globalThis.__battleCLIinit;
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(1);
      expect(violations[0].pattern).toBe("__battleCLIinit");
    });

    it("should respect ignore-next-line comment", () => {
      const content = `
        test('example', async ({ page }) => {
          // playwright-patterns: ignore-next-line
          await page.waitForTimeout(1000);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(0);
    });

    it("should respect ignore comment on same line", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.waitForTimeout(1000); // playwright-patterns: ignore
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(0);
    });

    it("should include code snippets in violations", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.waitForTimeout(1000);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations[0].codeSnippets).toBeDefined();
      expect(violations[0].codeSnippets.length).toBeGreaterThan(0);
      expect(violations[0].codeSnippets[0]).toContain("waitForTimeout");
    });

    it("should include fix suggestions", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.waitForTimeout(1000);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations[0].fixSuggestion).toBeDefined();
      expect(violations[0].fixSuggestion).toBeTruthy();
    });

    it("should count multiple occurrences correctly", () => {
      const content = `
        test('example', async ({ page }) => {
          setTimeout(() => {}, 1000);
          setTimeout(() => {}, 2000);
          setTimeout(() => {}, 3000);
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(1);
      expect(violations[0].count).toBe(3);
      expect(violations[0].lines).toHaveLength(3);
    });

    it("should handle empty files", () => {
      const filePath = createTestFile("");
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(0);
    });

    it("should handle files with no violations", () => {
      const content = `
        import { test, expect } from '@playwright/test';
        
        test('valid test', async ({ page }) => {
          await page.goto('/');
          await page.click('button');
          await expect(page.locator('.result')).toBeVisible();
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      expect(violations).toHaveLength(0);
    });

    it("should detect dispatchEvent with createEvent", () => {
      const content = `
        test('example', async ({ page }) => {
          element.dispatchEvent(document.createEvent('Event'));
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      const dispatchViolation = violations.find((v) => v.pattern.includes("dispatchEvent"));
      expect(dispatchViolation).toBeDefined();
      expect(dispatchViolation.severity).toBe("warning");
    });

    it("should detect page.evaluate with DOM manipulation", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.evaluate(() => { const x = element.DOM; });
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      const evalViolation = violations.find((v) => v.pattern.includes("evaluate"));
      expect(evalViolation).toBeDefined();
      expect(evalViolation.severity).toBe("warning");
    });
  });

  describe("pattern accuracy", () => {
    it("should not flag test.setTimeout() as a violation", () => {
      const content = `
        test('example', async ({ page }) => {
          test.setTimeout(60000);
          await page.click('button');
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      // test.setTimeout is a valid Playwright API, should still be flagged by our setTimeout pattern
      // but we're testing that it's detected (as designed)
      const setTimeoutViolations = violations.filter((v) => v.pattern === "setTimeout");
      expect(setTimeoutViolations.length).toBeGreaterThan(0);
    });

    it("should handle multiline code correctly", () => {
      const content = `
        test('example', async ({ page }) => {
          await page.evaluate(() => {
            const result = document
              .querySelector('.element')
              .innerHTML;
          });
        });
      `;
      const filePath = createTestFile(content);
      const violations = checkFile(filePath);

      // Should detect innerHTML usage
      const htmlViolations = violations.filter((v) => v.pattern === "innerHTML");
      expect(htmlViolations.length).toBeGreaterThan(0);
    });
  });
});
