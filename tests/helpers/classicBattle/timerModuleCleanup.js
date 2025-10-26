import { vi } from "vitest";

const ROUND_TIMER_SPECIFIERS = [
  "../../../src/helpers/timers/createRoundTimer.js",
  "../../src/helpers/timers/createRoundTimer.js",
  "/src/helpers/timers/createRoundTimer.js",
  "src/helpers/timers/createRoundTimer.js"
];

export function cleanupRoundTimerMocks() {
  for (const specifier of ROUND_TIMER_SPECIFIERS) {
    try {
      vi.doUnmock(specifier);
    } catch {}
  }
}
