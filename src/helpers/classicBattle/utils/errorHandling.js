import { error as logToConsole } from "../../logger.js";
import { exposeDebugState, readDebugState } from "../debugHooks.js";

const DEFAULT_SCOPE = "classicBattle";
const ERROR_HISTORY_KEY = "classicBattleErrors";
const ERROR_HISTORY_LIMIT = 25;
const ENV = typeof process !== "undefined" && process.env ? process.env : {};
const IS_PRODUCTION = ENV.NODE_ENV === "production";

function isPromiseLike(value) {
  return !!value && typeof value === "object" && typeof value.then === "function";
}

function normalizeContext(context) {
  if (!context) {
    return { scope: DEFAULT_SCOPE };
  }
  if (typeof context === "string") {
    return { scope: DEFAULT_SCOPE, message: context };
  }
  const { scope = DEFAULT_SCOPE, ...rest } = context;
  const normalized = { scope, ...rest };
  if (normalized.tags && !Array.isArray(normalized.tags)) {
    normalized.tags = [normalized.tags];
  }
  return normalized;
}

function formatLabel(entry) {
  const segments = [];
  if (entry.scope) segments.push(entry.scope);
  if (entry.operation) segments.push(entry.operation);
  return segments.join(":");
}

function pushDebugEntry(entry, context) {
  const key = context?.debugKey || ERROR_HISTORY_KEY;
  try {
    const existing = readDebugState(key);
    const history = Array.isArray(existing) ? existing.slice(-ERROR_HISTORY_LIMIT + 1) : [];
    history.push(entry);
    exposeDebugState(key, history);
  } catch (debugError) {
    if (!IS_PRODUCTION) {
      try {
        logToConsole(`[ClassicBattle] Failed to update debug state for ${key}`, debugError, entry);
      } catch (logError) {
        console.error("[ClassicBattle] logError debug fallback failed", logError);
      }
    }
  }
  if (typeof globalThis !== "undefined") {
    const bagKey = "__CLASSIC_BATTLE_ERROR_LOG";
    const bag = Array.isArray(globalThis[bagKey]) ? globalThis[bagKey] : [];
    bag.push(entry);
    globalThis[bagKey] = bag.slice(-ERROR_HISTORY_LIMIT);
  }
}

function createEntry(error, context) {
  const message = context.message || error?.message || "Unknown error";
  const stack = typeof error?.stack === "string" ? error.stack : undefined;
  return {
    at: Date.now(),
    scope: context.scope,
    operation: context.operation,
    message,
    data: context.data,
    tags: context.tags,
    errorName: error?.name,
    stack
  };
}

function routeToLogger(entry, error, suppressInProduction) {
  if (IS_PRODUCTION && suppressInProduction) return;
  const label = formatLabel(entry);
  const composedMessage = label ? `[ClassicBattle] ${label}: ${entry.message}` : entry.message;
  try {
    logToConsole(composedMessage, { ...entry, error });
  } catch (loggerError) {
    console.error("[ClassicBattle] Failed to log error", loggerError, composedMessage, error);
  }
}

/**
 * Log an error with contextual metadata and expose it to the debug panel.
 *
 * @summary Centralized error logger used across classic battle helpers.
 *
 * @pseudocode
 * 1. Normalize the provided context (scope, operation, message).
 * 2. Create a structured entry including timestamp, stack, and tags.
 * 3. Route the entry to the shared logger unless production suppression is requested.
 * 4. Push the entry to the in-memory debug state for diagnostics.
 * 5. Return the structured entry for callers that need to inspect it.
 *
 * @param {Error} error - Error instance that was thrown.
 * @param {object|string} [context] - Additional metadata describing the failure.
 * @param {object} [options] - Behaviour flags.
 * @param {boolean} [options.suppressInProduction=false] - Avoid logging when true in production builds.
 * @returns {{at: number, scope: string, operation?: string, message: string, data?: any, tags?: string[], errorName?: string, stack?: string}|null}
 */
export function logError(error, context, options = {}) {
  const { suppressInProduction = false } = options;
  if (IS_PRODUCTION && suppressInProduction) {
    return null;
  }
  const normalized = normalizeContext(context);
  const entry = createEntry(error, normalized);
  routeToLogger(entry, error, suppressInProduction);
  pushDebugEntry(entry, normalized);
  return entry;
}

function handleFallbackFailure(fallbackError, options, baseContext, isAsync) {
  const fallbackContext = {
    ...baseContext,
    operation: baseContext.operation ? `${baseContext.operation}:fallback` : "safeInvoke:fallback"
  };
  logError(fallbackError, fallbackContext, {
    suppressInProduction: options.suppressInProduction
  });
  if (options.rethrow) {
    if (isAsync) {
      return Promise.reject(fallbackError);
    }
    throw fallbackError;
  }
  return options.defaultValue;
}

function processError(error, options, baseContext, isAsync) {
  const entry = logError(error, baseContext, {
    suppressInProduction: options.suppressInProduction
  });
  if (typeof options.fallback === "function") {
    try {
      const result = options.fallback(error, entry);
      if (isPromiseLike(result)) {
        return result.catch((fallbackError) =>
          handleFallbackFailure(fallbackError, options, baseContext, true)
        );
      }
      return result;
    } catch (fallbackError) {
      return handleFallbackFailure(fallbackError, options, baseContext, isAsync);
    }
  }
  if (options.rethrow) {
    if (isAsync) {
      return Promise.reject(error);
    }
    throw error;
  }
  return options.defaultValue;
}

/**
 * Safely invoke a function while routing thrown errors through `logError`.
 *
 * @summary Execute the callback and capture failures with contextual reporting.
 *
 * @pseudocode
 * 1. Execute `fn` and return its value when it succeeds.
 * 2. When the call throws (or rejects), log the error with contextual metadata.
 * 3. If a fallback handler is provided, invoke it and return its result.
 * 4. Optionally rethrow the original error when `rethrow` is true.
 * 5. Otherwise, resolve with the configured default value.
 *
 * @template T
 * @param {() => T} fn - Callback to execute.
 * @param {object} [options] - Behaviour flags for error handling.
 * @param {object|string} [options.context] - Metadata describing the operation.
 * @param {Function} [options.fallback] - Optional fallback to run when `fn` fails.
 * @param {T} [options.defaultValue] - Value to return when no fallback is provided.
 * @param {boolean} [options.rethrow=false] - Rethrow the error after logging when true.
 * @param {boolean} [options.suppressInProduction=false] - Skip logging in production when true.
 * @returns {T|Promise<T|undefined>|undefined}
 */
export function safeInvoke(fn, options = {}) {
  const { context, ...rest } = options;
  const baseContext = normalizeContext(context);
  try {
    const result = fn();
    if (isPromiseLike(result)) {
      return result.catch((error) => processError(error, rest, baseContext, true));
    }
    return result;
  } catch (error) {
    return processError(error, rest, baseContext, false);
  }
}

export default { safeInvoke, logError };
