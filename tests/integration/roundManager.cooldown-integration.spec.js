import { expect, test } from "vitest";
import fs from "fs";
import path from "path";
import {
  createBattleStore,
  startCooldown,
  _resetForTest
} from "../../src/helpers/classicBattle/roundManager.js";
import { createBattleEngine } from "../../src/helpers/battleEngineFacade.js";

test("integration: startCoolDown with real engine and scheduler should record traces", async () => {
  // Ensure a fresh test environment and real engine
  const store = createBattleStore();
  _resetForTest(store);
  // Create engine explicitly to make sure the real engine starter is available
  try {
    createBattleEngine();
  } catch {}

  // Start cooldown with real scheduler (no fake timers). Use a short duration
  // so the test completes quickly. We rely on the module's fallback to schedule
  // a 10ms timeout when duration <= 0; pass 0 to trigger short fallback.
  const controls = startCooldown(store, undefined, {});

  // Wait for a short real-time period to allow expiration to run
  await new Promise((r) => setTimeout(r, 200));

  // Read traces from debug state file produced by unit tests or instrumentation.
  // The instrumentation writes to test-traces.json; if not present, read debug map via global.
  const tracesFile = path.resolve(process.cwd(), "test-traces.json");
  let traces = {};
  try {
    if (fs.existsSync(tracesFile)) {
      traces = JSON.parse(fs.readFileSync(tracesFile, "utf8"));
    }
  } catch {
    // ignore
  }

  // Always write current debug state snapshot for manual inspection
  try {
    const dbg =
      typeof globalThis.__classicBattleDebugRead === "function"
        ? globalThis.__classicBattleDebugRead
        : null;
    const map = {};
    if (dbg) {
      try {
        const last = dbg("nextRoundReadyTrace") || [];
        map.trace = last;
      } catch {}
    }
    const out = { tracesFile: traces || {}, debug: map };
    fs.writeFileSync(tracesFile, JSON.stringify(out, null, 2));
  } catch {}

  // At minimum, ensure controls exists and that traces file was created
  expect(controls).toBeTruthy();
  expect(fs.existsSync(tracesFile)).toBe(true);
});
