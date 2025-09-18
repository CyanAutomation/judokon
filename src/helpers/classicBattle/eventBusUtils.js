import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";

/**
 * Create an event bus with fallback implementations.
 *
 * @pseudocode
 * 1. Set up fallback functions for emit, on, and off using battleEvents.
 * 2. Allow overrides to be passed in via eventBusOverrides.
 * 3. Return an object with emit, on, and off methods.
 *
 * @param {object} [eventBusOverrides] - Optional overrides for event bus methods.
 * @param {Function} [eventBusOverrides.emit] - Override for emit function.
 * @param {Function} [eventBusOverrides.on] - Override for on function.
 * @param {Function} [eventBusOverrides.off] - Override for off function.
 * @returns {{emit: Function, on: Function, off: Function}} Event bus interface.
 */
export function createEventBus(eventBusOverrides) {
  const overrides = eventBusOverrides || {};
  let fallbackEmit = () => {};
  let fallbackOn = () => {};
  let fallbackOff = () => {};
  try {
    if (typeof emitBattleEvent === "function") fallbackEmit = emitBattleEvent;
  } catch {}
  try {
    if (typeof onBattleEvent === "function") fallbackOn = onBattleEvent;
  } catch {}
  try {
    if (typeof offBattleEvent === "function") fallbackOff = offBattleEvent;
  } catch {}
  const emit = typeof overrides.emit === "function" ? overrides.emit : fallbackEmit;
  const on = typeof overrides.on === "function" ? overrides.on : fallbackOn;
  const off = typeof overrides.off === "function" ? overrides.off : fallbackOff;
  return { emit, on, off };
}
