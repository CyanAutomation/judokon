import { vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as timerUtils from "../../../src/helpers/timerUtils.js";

/**
 * Render the real Classic Battle HTML into the document element.
 *
 * @pseudocode
 * 1. Resolve the battleClassic.html path from the repo root.
 * 2. Read the HTML into a string.
 * 3. Assign the markup to document.documentElement.innerHTML.
 * 4. Return a cleanup callback that clears the innerHTML when invoked.
 *
 * @returns {() => void} Cleanup function that clears the rendered DOM.
 */
export function renderClassicBattlePage() {
  const file = resolve(process.cwd(), "src/pages/battleClassic.html");
  const html = readFileSync(file, "utf-8");
  document.documentElement.innerHTML = html;
  return () => {
    document.documentElement.innerHTML = "";
  };
}

/**
 * Initialize the Classic Battle page script after the DOM is rendered.
 *
 * @pseudocode
 * 1. Dynamically import the battleClassic.init module.
 * 2. If the module exposes an init function, await its execution.
 * 3. Return the imported module for callers needing extra hooks.
 *
 * @returns {Promise<object>} Imported module for additional introspection.
 */
export async function initClassicBattlePage() {
  const mod = await import("../../../src/pages/battleClassic.init.js");
  if (typeof mod.init === "function") {
    await mod.init();
  }
  return mod;
}

/**
 * Convenience helper that renders the HTML and runs the page initializer.
 *
 * @pseudocode
 * 1. Render the battleClassic markup using renderClassicBattlePage().
 * 2. Await initClassicBattlePage() so scripts bind to the DOM.
 * 3. Return the cleanup callback alongside the imported module.
 *
 * @returns {Promise<{ cleanup: () => void, module: object }>} Cleanup handle and module reference.
 */
export async function bootstrapClassicBattlePage() {
  const cleanup = renderClassicBattlePage();
  const module = await initClassicBattlePage();
  return { cleanup, module };
}

/**
 * Mock the default timer values so the round timer resolves quickly in tests.
 *
 * @pseudocode
 * 1. Spy on timerUtils.getDefaultTimer.
 * 2. When the requested category is "roundTimer", return the injected duration.
 * 3. Otherwise return the fallback duration for non-round timers.
 * 4. Expose the spy so callers can restore the original implementation.
 *
 * @param {number} roundTimerSeconds - Duration to use for the round timer category.
 * @param {number} [fallbackSeconds=3] - Duration to use for all other timers.
 * @returns {import("vitest").MockInstance} Spy instance for restoration.
 */
export function mockRoundTimerDuration(roundTimerSeconds, fallbackSeconds = 3) {
  return vi
    .spyOn(timerUtils, "getDefaultTimer")
    .mockImplementation((category) =>
      category === "roundTimer" ? roundTimerSeconds : fallbackSeconds
    );
}
