/**
 * Integration tests for battleClassic page using real HTML loading
 * Tests initialization with actual page structure vs manual DOM manipulation
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";

describe("Battle Classic Integration", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    // Load actual HTML file
    const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");
    
    // Create JSDOM with real HTML
    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleClassic.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true
    });
    
    window = dom.window;
    document = window.document;
    
    // Set up globals
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    
    // Mock feature flag overrides for badge visibility
    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      enableTestMode: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
  });

  it("should have all required DOM elements from real HTML", () => {
    // Verify critical elements exist in real HTML
    expect(document.getElementById("battle-state-badge")).toBeTruthy();
    expect(document.getElementById("stat-buttons")).toBeTruthy();
    expect(document.getElementById("next-button")).toBeTruthy();
    expect(document.getElementById("quit-button")).toBeTruthy();
    expect(document.getElementById("player-card")).toBeTruthy();
    expect(document.getElementById("opponent-card")).toBeTruthy();
    expect(document.getElementById("round-message")).toBeTruthy();
    expect(document.getElementById("score-display")).toBeTruthy();
    expect(document.getElementById("snackbar-container")).toBeTruthy();
  });

  it("should initialize badge with real HTML structure", async () => {
    // Import and run initialization
    const { initBattleStateBadge } = await import("../../src/pages/battleClassic.init.js");
    
    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    
    // Debug: Check actual state
    console.log("Badge initial state:", {
      hasHiddenAttr: badge.hasAttribute("hidden"),
      hidden: badge.hidden,
      outerHTML: badge.outerHTML
    });
    
    // Run initialization
    initBattleStateBadge();
    
    // Debug: Check state after init
    console.log("Badge after init:", {
      hasHiddenAttr: badge.hasAttribute("hidden"),
      hidden: badge.hidden,
      textContent: badge.textContent,
      outerHTML: badge.outerHTML
    });
    
    // Verify badge is now visible
    expect(badge.hasAttribute("hidden")).toBe(false);
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe("Lobby");
  });

  it("should demonstrate difference from manual DOM tests", () => {
    // This test shows what manual DOM tests miss
    const badge = document.getElementById("battle-state-badge");
    
    // Real HTML has proper structure
    expect(badge.tagName).toBe("SPAN");
    expect(badge.hasAttribute("hidden")).toBe(true);
    
    // Real HTML has all required elements that manual DOM tests often skip
    expect(document.getElementById("snackbar-container")).toBeTruthy();
    expect(document.querySelector("header")).toBeTruthy();
    expect(document.querySelector("main")).toBeTruthy();
    
    // Manual DOM tests typically create minimal structure like:
    // document.body.innerHTML = '<div id="battle-state-badge"></div>';
    // This misses the proper HTML structure and attributes
  });

  it("should load module successfully with real HTML", async () => {
    // This test verifies the module can be imported and doesn't throw
    // when working with real HTML structure
    let initError = null;
    
    try {
      const module = await import("../../src/pages/battleClassic.init.js");
      expect(module.init).toBeDefined();
      expect(module.initBattleStateBadge).toBeDefined();
    } catch (error) {
      initError = error;
    }
    
    expect(initError).toBeNull();
  });

  it("should work with complete HTML structure vs minimal DOM", () => {
    // Integration test advantage: tests with complete HTML structure
    const elements = [
      "battle-state-badge",
      "stat-buttons", 
      "next-button",
      "quit-button",
      "player-card",
      "opponent-card",
      "round-message",
      "score-display",
      "snackbar-container"
    ];
    
    // All elements exist in real HTML
    elements.forEach(id => {
      expect(document.getElementById(id)).toBeTruthy();
    });
    
    // Real HTML has proper semantic structure
    expect(document.querySelector("header[role='banner']")).toBeTruthy();
    expect(document.querySelector("main[role='main']")).toBeTruthy();
    expect(document.querySelector("section[aria-label='Cards']")).toBeTruthy();
  });
});