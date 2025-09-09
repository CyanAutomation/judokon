/**
 * Utility functions for converting manual DOM tests to real HTML tests
 * Provides helpers to reduce boilerplate when using real HTML structure
 */

import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Create a JSDOM instance with real battleClassic.html
 * @returns {Object} { dom, window, document, cleanup }
 */
export function createRealHtmlTestEnvironment() {
  const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  const dom = new JSDOM(htmlContent, {
    url: "http://localhost:3000/battleClassic.html",
    pretendToBeVisual: true
  });

  const window = dom.window;
  const document = window.document;

  // Set up globals
  global.window = window;
  global.document = document;

  return {
    dom,
    window,
    document,
    cleanup: () => dom.window.close()
  };
}

/**
 * Validate that real HTML has expected structure that manual DOM tests miss
 * @param {Document} document - DOM document to validate
 * @returns {Object} Validation results
 */
export function validateRealHtmlStructure(document) {
  const results = {
    hasSemanticStructure: false,
    hasAccessibilityAttributes: false,
    hasRequiredElements: false,
    missingInManualDOM: []
  };

  // Check semantic structure
  const header = document.querySelector("header[role='banner']");
  const main = document.querySelector("main[role='main']");
  if (header && main) {
    results.hasSemanticStructure = true;
  } else {
    results.missingInManualDOM.push("semantic structure (header, main)");
  }

  // Check accessibility attributes
  const ariaElements = document.querySelectorAll("[aria-live], [aria-atomic], [aria-label]");
  if (ariaElements.length > 0) {
    results.hasAccessibilityAttributes = true;
  } else {
    results.missingInManualDOM.push("accessibility attributes");
  }

  // Check required elements that manual DOM often skips
  const requiredElements = [
    "snackbar-container",
    "battle-state-badge",
    "round-message",
    "score-display"
  ];

  const foundElements = requiredElements.filter((id) => document.getElementById(id));

  if (foundElements.length === requiredElements.length) {
    results.hasRequiredElements = true;
  } else {
    const missing = requiredElements.filter((id) => !document.getElementById(id));
    results.missingInManualDOM.push(`missing elements: ${missing.join(", ")}`);
  }

  return results;
}

/**
 * Compare manual DOM approach vs real HTML approach
 * @param {Function} testFn - Test function to run with both approaches
 * @returns {Object} Comparison results
 */
export async function compareTestApproaches(testFn) {
  const results = {
    manualDOM: { success: false, error: null },
    realHTML: { success: false, error: null }
  };

  // Test with manual DOM
  try {
    const manualDom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    global.window = manualDom.window;
    global.document = manualDom.window.document;

    await testFn("manual");
    results.manualDOM.success = true;
    manualDom.window.close();
  } catch (error) {
    results.manualDOM.error = error.message;
  }

  // Test with real HTML
  try {
    const { cleanup } = createRealHtmlTestEnvironment();
    await testFn("real");
    results.realHTML.success = true;
    cleanup();
  } catch (error) {
    results.realHTML.error = error.message;
  }

  return results;
}
