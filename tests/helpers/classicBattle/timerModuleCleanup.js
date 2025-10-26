import { vi } from "vitest";

const ROUND_TIMER_SPECIFIERS = [
  "../../../src/helpers/timers/createRoundTimer.js",
  "../../src/helpers/timers/createRoundTimer.js",
  "/src/helpers/timers/createRoundTimer.js",
  "src/helpers/timers/createRoundTimer.js"
];

/**
 * Cleans up round timer module mocks by attempting to unmock various path specifiers.
 * Used in test cleanup to ensure timer modules are properly reset between tests.
 * 
 * @pseudocode
 * FOR each timer module path specifier:
 *   TRY to unmock the module
 *   CATCH and ignore any unmock failures
 */
export function cleanupRoundTimerMocks() {
  for (const specifier of ROUND_TIMER_SPECIFIERS) {
    try {
      vi.doUnmock(specifier);
    } catch {}
  }
}
