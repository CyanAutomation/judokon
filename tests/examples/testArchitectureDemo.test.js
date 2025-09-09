/**
 * Demonstration of test architecture patterns
 * Shows proper categorization and naming conventions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createRealHtmlTestEnvironment,
  validateRealHtmlStructure
} from "../utils/realHtmlTestUtils.js";

// ✅ Pattern 1: Unit Tests (Pure Logic)
describe("Score Calculator (Unit)", () => {
  it("calculates basic score correctly", () => {
    const calculateScore = (a, b) => a + b;
    expect(calculateScore(5, 3)).toBe(8);
  });
});

// ✅ Pattern 2: Component Tests (Simple DOM)
describe("Button Handler (DOM)", () => {
  it("handles click events", () => {
    // Manual DOM acceptable for simple component testing
    document.body.innerHTML = '<button id="test-btn">Click</button>';
    const btn = document.getElementById("test-btn");

    let clicked = false;
    btn.addEventListener("click", () => {
      clicked = true;
    });
    btn.click();

    expect(clicked).toBe(true);
  });
});

// ✅ Pattern 3: Integration Tests (Real HTML)
describe("Page Initialization (Integration)", () => {
  let testEnv;

  beforeEach(() => {
    testEnv = createRealHtmlTestEnvironment();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  it("validates complete HTML structure", () => {
    const { document } = testEnv;
    const validation = validateRealHtmlStructure(document);

    expect(validation.hasSemanticStructure).toBe(true);
    expect(validation.hasAccessibilityAttributes).toBe(true);
    expect(validation.hasRequiredElements).toBe(true);
  });

  it("tests initialization with real DOM context", () => {
    const { document } = testEnv;

    // Test with complete HTML structure
    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge.tagName).toBe("SPAN");
    expect(badge.hasAttribute("hidden")).toBe(true);

    // Test accessibility attributes that manual DOM would miss
    const snackbar = document.getElementById("snackbar-container");
    expect(snackbar.getAttribute("aria-live")).toBe("polite");
    expect(snackbar.getAttribute("aria-atomic")).toBe("true");
  });
});
