/**
 * Comparison test showing differences between manual DOM manipulation and real HTML loading
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";

describe("Manual DOM vs Real HTML Comparison", () => {
  let dom;
  let window;
  let document;

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
  });

  describe("Manual DOM Approach (Current Tests)", () => {
    beforeEach(() => {
      // Simulate typical manual DOM setup used in existing tests
      dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
      window = dom.window;
      document = window.document;
      global.window = window;
      global.document = document;

      // Manual DOM creation (typical of existing tests)
      document.body.innerHTML = `
        <div id="battle-state-badge"></div>
        <div id="stat-buttons"></div>
        <div id="next-button"></div>
      `;
    });

    it("works with minimal DOM but misses real structure", async () => {
      const badge = document.getElementById("battle-state-badge");
      expect(badge).toBeTruthy();

      // Manual DOM lacks proper attributes and structure
      expect(badge.tagName).toBe("DIV"); // Wrong element type
      expect(badge.hasAttribute("hidden")).toBe(false); // Missing hidden attribute
      expect(document.querySelector("header")).toBeFalsy(); // No semantic structure
      expect(document.querySelector("main")).toBeFalsy(); // No semantic structure
    });
  });

  describe("Real HTML Approach (Integration Tests)", () => {
    beforeEach(() => {
      // Load actual HTML file
      const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
      const htmlContent = readFileSync(htmlPath, "utf-8");

      dom = new JSDOM(htmlContent, {
        url: "http://localhost:3000/battleClassic.html",
        pretendToBeVisual: true
      });

      window = dom.window;
      document = window.document;
      global.window = window;
      global.document = document;
    });

    it("tests with actual HTML structure and attributes", () => {
      const badge = document.getElementById("battle-state-badge");
      expect(badge).toBeTruthy();

      // Real HTML has correct structure
      expect(badge.tagName).toBe("SPAN"); // Correct element type
      expect(badge.hasAttribute("hidden")).toBe(true); // Has hidden attribute
      expect(document.querySelector("header[role='banner']")).toBeTruthy(); // Semantic structure
      expect(document.querySelector("main[role='main']")).toBeTruthy(); // Semantic structure
      expect(document.querySelector("section[aria-label='Cards']")).toBeTruthy(); // Accessibility
    });

    it("reveals issues that manual DOM tests miss", () => {
      // Real HTML has elements that manual tests often skip
      expect(document.getElementById("snackbar-container")).toBeTruthy();
      expect(document.getElementById("round-message")).toBeTruthy();
      expect(document.getElementById("score-display")).toBeTruthy();

      // Real HTML has proper ARIA attributes
      const roundMessage = document.getElementById("round-message");
      expect(roundMessage.getAttribute("aria-live")).toBe("polite");
      expect(roundMessage.getAttribute("aria-atomic")).toBe("true");

      // Real HTML has proper semantic structure
      expect(document.querySelector(".battle-layout")).toBeTruthy();
      expect(document.querySelector(".controls")).toBeTruthy();
    });
  });

  it("demonstrates the testing gap", () => {
    // This test shows how manual DOM manipulation can mask real issues

    // Manual DOM test might pass:
    const manualDom = new JSDOM(`<div id="battle-state-badge"></div>`);
    const manualBadge = manualDom.window.document.getElementById("battle-state-badge");
    expect(manualBadge).toBeTruthy(); // ✅ Passes

    // But real HTML test reveals the actual requirements:
    const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");
    const realDom = new JSDOM(htmlContent);
    const realBadge = realDom.window.document.getElementById("battle-state-badge");

    // Real HTML has different requirements
    expect(realBadge.tagName).toBe("SPAN"); // Not DIV
    expect(realBadge.hasAttribute("hidden")).toBe(true); // Has hidden attribute
    expect(manualBadge.hasAttribute("hidden")).toBe(false); // Manual DOM lacks this

    manualDom.window.close();
    realDom.window.close();
  });
});
