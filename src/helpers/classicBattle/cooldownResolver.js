/**
 * Cooldown dependency and configuration resolution utilities.
 *
 * Provides helpers for resolving timer factories, renderers, and
 * cooldown-specific configuration from dependencies or defaults.
 *
 * @module cooldownResolver
 */

import { createRoundTimer as defaultCreateRoundTimer } from "../timers/createRoundTimer.js";
import { attachCooldownRenderer as defaultAttachCooldownRenderer } from "../CooldownRenderer.js";

/**
 * Select timer factory from overrides or default.
 *
 * @pseudocode
 * 1. Check if override is a function.
 * 2. Return override or fallback to default factory.
 *
 * @param {Function} [override] - Optional override factory
 * @returns {Function | null}
 */
export function selectTimerFactory(override) {
  if (typeof override === "function") {
    return override;
  }
  return typeof defaultCreateRoundTimer === "function" ? defaultCreateRoundTimer : null;
}

/**
 * Select renderer factory from overrides or default.
 *
 * @pseudocode
 * 1. Check if override is a function.
 * 2. Return override or fallback to default factory.
 *
 * @param {Function} [override] - Optional override factory
 * @returns {Function | null}
 */
export function selectRendererFactory(override) {
  if (typeof override === "function") {
    return override;
  }
  return typeof defaultAttachCooldownRenderer === "function" ? defaultAttachCooldownRenderer : null;
}

/**
 * Instantiate timer from factory function.
 *
 * @pseudocode
 * 1. Validate factory is a function.
 * 2. Invoke factory and return result.
 * 3. Silently return null on failure.
 *
 * @param {Function} factory - Timer factory
 * @returns {any} Timer instance or null
 */
export function instantiateTimer(factory) {
  if (typeof factory !== "function") {
    return null;
  }
  try {
    return factory();
  } catch {
    // Silently handle factory failures to maintain UI responsiveness
  }
  return null;
}

/**
 * Normalize renderer options object.
 *
 * @pseudocode
 * 1. Validate options is an object.
 * 2. Return options or empty object if invalid.
 *
 * @param {any} options - Options to normalize
 * @returns {object} Empty object or provided object
 */
export function normalizeRendererOptions(options) {
  if (options && typeof options === "object") {
    return options;
  }
  return {};
}

/**
 * Resolve opponent prompt buffer from multiple sources.
 *
 * @pseudocode
 * 1. Check rendererOptions for opponentPromptBufferMs.
 * 2. Fallback to cooldownResult buffer.
 * 3. Return undefined if none found.
 *
 * @param {any} cooldownResult - Result from computeNextRoundCooldown
 * @param {object} rendererOptions - Renderer configuration
 * @returns {number | undefined}
 */
export function resolveOpponentPromptBuffer(cooldownResult, rendererOptions) {
  const optionsBuffer = Number(rendererOptions?.opponentPromptBufferMs);
  if (Number.isFinite(optionsBuffer) && optionsBuffer >= 0) {
    return optionsBuffer;
  }

  if (cooldownResult && typeof cooldownResult === "object") {
    const resultBuffer = Number(cooldownResult.opponentPromptBufferMs);
    if (Number.isFinite(resultBuffer) && resultBuffer >= 0) {
      return resultBuffer;
    }
  }

  return undefined;
}

/**
 * Parse seconds from various result formats.
 *
 * @pseudocode
 * 1. Try direct numeric conversion.
 * 2. Check object properties (seconds, value).
 * 3. Return original value as fallback.
 *
 * @param {any} result - Value to parse
 * @returns {number} Parsed value or original
 */
export function parseSecondsFromResult(result) {
  const direct = Number(result);
  if (Number.isFinite(direct)) return direct;

  if (result && typeof result === "object") {
    const candidates = [result.seconds, result.value];
    for (const candidate of candidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric)) return numeric;
    }
  }

  return direct;
}
