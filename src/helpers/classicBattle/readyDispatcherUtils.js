/**
 * @summary Utilities for reading and normalizing ready dispatcher signatures.
 * @module readyDispatcherUtils
 */

const READY_DISPATCHER_IDENTITY_SYMBOL =
  typeof Symbol === "function"
    ? Symbol.for("classicBattle.readyDispatcherIdentity")
    : "__classicBattle_readyDispatcherIdentity__";

/**
 * @summary Read a dispatcher's identity signature.
 *
 * Attempts to extract a unique identifier from a dispatcher function using
 * multiple strategies: symbol property, named properties, or fallback to undefined.
 *
 * @param {any} candidate - The function to inspect.
 * @returns {string|undefined} A string signature, or undefined if not found.
 *
 * @pseudocode
 * 1. Return undefined if candidate is not a function.
 * 2. Check for symbol-based identity first.
 * 3. Fall back to readyDispatcherId or dispatcherId properties.
 * 4. Return undefined if no signature found.
 */
export function readReadyDispatcherSignature(candidate) {
  if (typeof candidate !== "function") return undefined;
  const identitySymbol = READY_DISPATCHER_IDENTITY_SYMBOL;
  const symbolValue = identitySymbol ? candidate[identitySymbol] : undefined;
  if (typeof symbolValue === "string" || typeof symbolValue === "number") {
    return String(symbolValue);
  }
  if (typeof candidate.readyDispatcherId === "string" && candidate.readyDispatcherId) {
    return candidate.readyDispatcherId;
  }
  if (typeof candidate.dispatcherId === "string" && candidate.dispatcherId) {
    return candidate.dispatcherId;
  }
  return undefined;
}

/**
 * @summary Get the ready dispatcher identity symbol.
 *
 * @description Returns the Symbol.for key or fallback string used for dispatcher identity tracking.
 *
 * @returns {symbol|string} The symbol or string key used for dispatcher identity.
 */
export function getReadyDispatcherIdentitySymbol() {
  return READY_DISPATCHER_IDENTITY_SYMBOL;
}
