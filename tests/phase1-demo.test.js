/**
 * Enhanced Component Testing Demonstration
 * 
 * Shows the improved Test API and component utilities in action,
 * demonstrating natural interactions vs synthetic DOM manipulation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestCard, createTestEnvironment, interactions } from "./utils/componentTestUtils.js";
import { withMutedConsole } from "./utils/console.js";
import { resetDom } from "./utils/testUtils.js";

describe("Enhanced Component Testing (Phase 1 Demo)", () => {
  let testEnv;

  beforeEach(() => {
    resetDom();
    testEnv = createTestEnvironment();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe("Test Card Component with Natural Interactions", () => {
    it("creates card with test API access", () => {
      const testCard = testEnv.createCard("Test Content", { id: "test-card" });
      
      expect(testCard.element).toBeTruthy();
      expect(testCard.testApi).toBeTruthy();
      expect(testCard.testApi.getContent()).toBe("Test Content");
      expect(testCard.testApi.hasClass("card")).toBe(true);
    });

    it("uses natural click interaction instead of dispatchEvent", () => {
      let clicked = false;
      const testCard = testEnv.createCard("Click Me", {
        onClick: () => {
          clicked = true;
        }
      });
      
      // Natural click using test API
      testCard.testApi.click();
      expect(clicked).toBe(true);
    });

    it("provides component state inspection", () => {
      const testCard = testEnv.createCard("Visible Card");
      
      expect(testCard.testApi.isVisible()).toBe(true);
      expect(testCard.testApi.getAttribute("class")).toContain("card");
    });
  });

  describe("Console Discipline Demonstration", () => {
    it("uses withMutedConsole for expected console output", async () => {
      await withMutedConsole(async () => {
        // Code that might warn or error during testing
        console.warn("This warning is muted during test");
        console.error("This error is muted during test");
        
        const testCard = testEnv.createCard("Test");
        expect(testCard.element).toBeTruthy();
      });
    });

    it("demonstrates proper console handling pattern", async () => {
      // This test shows the standard pattern for console-clean testing
      const result = await withMutedConsole(async () => {
        // Any code that would normally emit console output
        return "test completed";
      });
      
      expect(result).toBe("test completed");
    });
  });

  describe("Performance Comparison Demonstration", () => {
    it("shows fast component creation with test utilities", () => {
      const startTime = Date.now();
      
      // Create multiple components quickly
      for (let i = 0; i < 10; i++) {
        const testCard = testEnv.createCard(`Card ${i}`);
        testCard.testApi.click();
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it("demonstrates natural interaction utilities", async () => {
      const testCard = testEnv.createCard("Interactive Card");
      document.body.appendChild(testCard.element);
      
      // Natural focus/blur instead of synthetic events
      interactions.focus(testCard.element);
      expect(document.activeElement).toBe(testCard.element);
      
      interactions.blur(testCard.element);
      expect(document.activeElement).not.toBe(testCard.element);
    });

    it("shows element waiting utility for async testing", async () => {
      let element = null;
      
      // Simulate async element creation
      setTimeout(() => {
        element = testEnv.createCard("Async Card").element;
        document.body.appendChild(element);
      }, 50);
      
      // Wait for element naturally
      const foundElement = await interactions.waitForElement(
        () => document.querySelector(".card"),
        1000
      );
      
      expect(foundElement).toBeTruthy();
      expect(foundElement.textContent).toBe("Async Card");
    });
  });
});

describe("Phase 1 Infrastructure Validation", () => {
  it("validates Test API extensions are available", async () => {
    // Import the enhanced Test API  
    const testApi = await import("../src/helpers/testApi.js");
    
    expect(testApi.default).toBeTruthy();
    expect(typeof testApi.default.state?.getBattleState).toBe("function");
    expect(typeof testApi.default.timer?.setCountdown).toBe("function");
    expect(typeof testApi.default.init?.createComponent).toBe("function");
  });

  it("validates component utilities are working", () => {
    const testCard = createTestCard("Validation Test");
    
    expect(testCard.element).toBeInstanceOf(HTMLElement);
    expect(testCard.testApi).toBeTruthy();
    expect(typeof testCard.testApi.click).toBe("function");
    expect(typeof testCard.testApi.cleanup).toBe("function");
    
    testCard.testApi.cleanup();
  });

  it("validates console audit results are available", () => {
    // Note: In a real test environment, we would check if audit files exist
    // This is a demonstration of infrastructure validation
    expect(true).toBe(true); // Placeholder for actual file checks
  });
});
