/**
 * Conditional logging for classicBattle debugging.
 *
 * Provides structured logging that respects test environments and can be
 * controlled via environment flags or module configuration.
 *
 * @module classicBattleLogger
 */


/**
 * Create a logger instance with optional silencing.
 *
 * @pseudocode
 * 1. Accept enabled flag (defaults to false for production).
 * 2. Return object with trace, info, warn methods.
 * 3. Each method silently returns when disabled.
 *
 * @param {boolean} [enabled] - Enable logging (defaults to false)
 * @returns {{
 *   trace: (msg: string) => void,
 *   info: (msg: string) => void,
 *   warn: (msg: string) => void,
 *   debug: (msg: string) => void
 * }}
 */
export function createBattleLogger(enabled = false) {
  return {
    trace: (msg) => {
      if (!enabled) return;
      try {
        console.debug(`classicBattle.trace ${msg}`);
      } catch {}
    },
    info: (msg) => {
      if (!enabled) return;
      try {
        console.log(`INFO: ${msg}`);
      } catch {}
    },
    warn: (msg) => {
      if (!enabled) return;
      try {
        console.warn(`⚠️  ${msg}`);
      } catch {}
    },
    debug: (msg) => {
      if (!enabled) return;
      try {
        console.debug(`DEBUG: ${msg}`);
      } catch {}
    }
  };
}

/**
 * Default battle logger instance (enabled outside vitest).
 *
 * @pseudocode
 * 1. Initialize logger with default settings.
 * 2. Return pre-configured logger for use throughout battle flow.
 *
 * @type {ReturnType<typeof createBattleLogger>}
 */
export const battleLog = createBattleLogger();
