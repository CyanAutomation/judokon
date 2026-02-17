/**
 * Determine whether event payloads should be frozen after cloning.
 *
 * @returns {boolean} True when running outside production builds.
 * @pseudocode
 * 1. Read `process.env.NODE_ENV` when available.
 * 2. Detect explicit Vitest mode via `process.env.VITEST`.
 * 3. Freeze payloads for test/development-like environments.
 */
function shouldFreezePayloads() {
  const nodeEnv = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
  const isVitest = typeof process !== "undefined" && Boolean(process.env?.VITEST);
  return isVitest || nodeEnv !== "production";
}

function cloneFallback(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (const item of value) {
      copy.push(cloneFallback(item, seen));
    }
    return copy;
  }

  if (value instanceof Date) return new Date(value.getTime());

  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    for (const [key, mapValue] of value.entries()) {
      copy.set(cloneFallback(key, seen), cloneFallback(mapValue, seen));
    }
    return copy;
  }

  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    for (const setValue of value.values()) {
      copy.add(cloneFallback(setValue, seen));
    }
    return copy;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const copy = {};
  seen.set(value, copy);
  for (const [key, nestedValue] of Object.entries(value)) {
    copy[key] = cloneFallback(nestedValue, seen);
  }
  return copy;
}

function clonePayload(value) {
  if (typeof globalThis?.structuredClone === "function") {
    try {
      return globalThis.structuredClone(value);
    } catch {}
  }
  return cloneFallback(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item, seen);
  } else if (value instanceof Map) {
    for (const [key, mapValue] of value.entries()) {
      deepFreeze(key, seen);
      deepFreeze(mapValue, seen);
    }
  } else if (value instanceof Set) {
    for (const setValue of value.values()) deepFreeze(setValue, seen);
  } else {
    for (const nestedValue of Object.values(value)) deepFreeze(nestedValue, seen);
  }

  return Object.freeze(value);
}

/**
 * Clone event payloads and freeze them in non-production modes.
 *
 * @param {any} payload - Raw payload provided by emitters.
 * @returns {any} Immutable-safe payload for dispatch.
 * @pseudocode
 * 1. Deep-clone payload using `structuredClone` when available.
 * 2. Fall back to a recursive clone for plain object payloads.
 * 3. Deep-freeze cloned payload in test/development environments.
 */
export function createImmutableEventPayload(payload) {
  const clonedPayload = clonePayload(payload);
  if (shouldFreezePayloads()) {
    return deepFreeze(clonedPayload);
  }
  return clonedPayload;
}
