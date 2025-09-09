/**
 * Simplified test using utility functions for real HTML testing
 * Demonstrates how to easily convert manual DOM tests
 */

import { beforeEach, afterEach, describe, it, expect } from "vitest";
import {
  createRealHtmlTestEnvironment,
  validateRealHtmlStructure
} from "../utils/realHtmlTestUtils.js";
import { setOpponentDelay } from "../../src/helpers/classicBattle/snackbar.js";
import { bindUIHelperEventHandlersDynamic } from "../../src/helpers/classicBattle/uiEventHandlers.js";
import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";

describe("UI handlers: opponent message (Simplified with Utils)", () => {
  let testEnv;

  beforeEach(() => {
    testEnv = createRealHtmlTestEnvironment();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  it("shows snackbar with real HTML structure (simplified)", async () => {
    const { document } = testEnv;

    // Validate we have real HTML structure
    const validation = validateRealHtmlStructure(document);
    expect(validation.hasRequiredElements).toBe(true);
    expect(validation.hasAccessibilityAttributes).toBe(true);

    setOpponentDelay(10);
    bindUIHelperEventHandlersDynamic();
    emitBattleEvent("statSelected", { opts: {} });

    await new Promise((r) => setTimeout(r, 15));

    const snack = document.getElementById("snackbar-container");
    expect(snack.textContent || "").toMatch(/Opponent is choosing/i);
  });

  it("validates structure that manual DOM tests miss", () => {
    const { document } = testEnv;
    const validation = validateRealHtmlStructure(document);

    // Real HTML has structure that manual DOM tests typically skip
    expect(validation.hasSemanticStructure).toBe(true);
    expect(validation.hasAccessibilityAttributes).toBe(true);
    expect(validation.hasRequiredElements).toBe(true);
    expect(validation.missingInManualDOM).toHaveLength(0);
  });
});
