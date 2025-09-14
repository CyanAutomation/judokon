import { vi } from "vitest";

/**
 * Consistently stub `createRoundTimer` for deterministic tests.
 *
 * @pseudocode
 * 1. Build a mock `createRoundTimer` factory that collects `tick`/`expired` handlers.
 * 2. On `start(dur)`:
 *    - Resolve tick sequence from `options.ticks` or derive from `dur`.
 *    - In `scheduled` mode, emit first tick immediately, schedule the rest at `intervalMs`.
 *    - In `immediate` mode, emit all ticks synchronously.
 *    - Emit `expired` according to `options.expire` policy.
 * 3. Register the mock with `vi.doMock` for common resolver paths.
 *
 * @param {{
 *   scheduled?: boolean,
 *   intervalMs?: number,
 *   tickCount?: number,
 *   ticks?: number[],
 *   emitInitial?: boolean,
 *   expire?: boolean,
 *   moduleId?: string
 * }} [options]
 * @returns {{unmock: () => void}} Restore handle.
 */
export function mockCreateRoundTimer(options = {}) {
  const {
    scheduled = true,
    intervalMs = 1000,
    tickCount = 2,
    ticks: providedTicks,
    emitInitial = true,
    expire = true,
    moduleId
  } = options;

  const factory = () => ({
    createRoundTimer: () => {
      const handlers = { tick: new Set(), expired: new Set() };
      return {
        on: vi.fn((evt, fn) => handlers[evt]?.add(fn)),
        off: vi.fn((evt, fn) => handlers[evt]?.delete(fn)),
        start: vi.fn((dur) => {
          const d = Math.max(0, Number(dur) || 0);
          const seq = Array.isArray(providedTicks)
            ? providedTicks.slice()
            : buildTicksFromDuration(d, tickCount);

          if (!scheduled) {
            if (emitInitial) emitTicks(handlers, seq);
            if (expire) emitExpired(handlers);
            return;
          }
          // scheduled
          let t = 0;
          if (emitInitial && seq.length) {
            handlers.tick.forEach((fn) => fn(seq[0]));
            t = 1;
          }
          seq.slice(t).forEach((val, idx) => {
            setTimeout(() => handlers.tick.forEach((fn) => fn(val)), (idx + 1) * intervalMs);
          });
          if (expire) {
            const delay = (seq.length - t + 1) * intervalMs;
            setTimeout(() => emitExpired(handlers), delay);
          }
        }),
        stop: vi.fn(() => emitExpired(handlers))
      };
    }
  });

  const targets = moduleId
    ? [moduleId]
    : [
        // Common specifiers used across this repo from different test folders
        "../../src/helpers/timers/createRoundTimer.js",
        "../../../src/helpers/timers/createRoundTimer.js",
        "/src/helpers/timers/createRoundTimer.js",
        "src/helpers/timers/createRoundTimer.js"
      ];

  for (const id of targets) {
    try {
      vi.doMock(id, factory);
    } catch {}
  }

  return { unmock: () => unmockCreateRoundTimer({ moduleId }) };
}

/**
 * Undo the mock registered by `mockCreateRoundTimer`.
 *
 * @param {{moduleId?: string}} [opts]
 */
export function unmockCreateRoundTimer(opts = {}) {
  const ids = opts.moduleId
    ? [opts.moduleId]
    : [
        "../../src/helpers/timers/createRoundTimer.js",
        "../../../src/helpers/timers/createRoundTimer.js",
        "/src/helpers/timers/createRoundTimer.js",
        "src/helpers/timers/createRoundTimer.js"
      ];
  for (const id of ids) {
    try {
      vi.doUnmock(id);
    } catch {}
  }
}

function buildTicksFromDuration(d, count) {
  if (d <= 0) return [];
  const out = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    const val = Math.max(0, d - i);
    if (val > 0) out.push(val);
  }
  return out;
}

function emitTicks(handlers, seq) {
  for (const v of seq) handlers.tick.forEach((fn) => fn(v));
}

function emitExpired(handlers) {
  handlers.expired.forEach((fn) => fn());
}

