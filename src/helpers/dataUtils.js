import { getMissingJudokaFields } from "./judokaValidation.js";
import { debugLog } from "./debug.js";
import { isNodeEnvironment, isBrowserEnvironment, getBaseUrl } from "./env.js";

// In-memory cache for data fetched from URLs
const dataCache = new Map();

// Lazily instantiated Ajv singleton
let ajvInstance;

/**
 * Lazily instantiate and return a singleton Ajv instance with format support.
 *
 * @pseudocode
 * 1. Return `ajvInstance` when it already exists.
 * 2. If running under Node:
 *    - Import `Ajv` and `ajv-formats`.
 *    - Create an Ajv instance and apply the formats.
 * 3. If running in a browser window:
 *    - Use `window.Ajv` when it already exists.
 *    - Otherwise, attempt to `import("../vendor/ajv6.min.js")` and instantiate.
 *    - On failure, import Ajv from a CDN and try again.
 *    - If both imports fail, fall back to a stub that skips validation.
 * 4. Otherwise:
 *    - Import `Ajv` and `ajv-formats`, then apply the formats.
 * 5. Return the Ajv instance.
 *
 * @returns {Promise<import("ajv").default>} Ajv instance.
 */
/**
 * Strategy loader for Ajv in Node environments.
 * @type {{load: () => Promise<import('ajv').default>}}
 */
export const nodeAjvLoader = {
  async load() {
    const Ajv = (await import("ajv")).default;
    const ajv = new Ajv();
    const addFormats = (await import("ajv-formats")).default;
    addFormats(ajv);
    return ajv;
  }
};

/**
 * Strategy loader for Ajv in browser environments.
 * @type {{load: () => Promise<import('ajv').default>}}
 */
export const browserAjvLoader = {
  async load() {
    if (window.Ajv) {
      return new window.Ajv();
    }
    try {
      const { default: Ajv } = await import("../vendor/ajv6.min.js");
      return new Ajv();
    } catch (localError) {
      try {
        const { default: Ajv } = await import("https://esm.sh/ajv@6");
        return new Ajv();
      } catch (cdnError) {
        console.error("Error loading Ajv:", localError, cdnError);
        return fallbackAjvLoader.load();
      }
    }
  }
};

/**
 * Fallback loader returning a stub that disables validation.
 * @type {{load: () => import('ajv').default}}
 */
export const fallbackAjvLoader = {
  load() {
    const message = "Ajv import failed; validation disabled";
    const stub = {
      errors: null,
      compile: () => {
        const validate = () => {
          const error = { message };
          stub.errors = [error];
          validate.errors = [error];
          return false;
        };
        return validate;
      },
      errorsText: () => message
    };
    return stub;
  }
};

/**
 * Lazily instantiate and return a singleton Ajv instance with format support.
 *
 * @pseudocode
 * 1. Return `ajvInstance` when already created.
 * 2. Select `nodeAjvLoader` when running in Node, otherwise `browserAjvLoader`.
 * 3. Attempt to load Ajv using the selected strategy.
 * 4. On failure, fall back to `fallbackAjvLoader`.
 * 5. Return the Ajv instance.
 *
 * @returns {Promise<import("ajv").default>} Ajv instance.
 */
export async function getAjv() {
  if (ajvInstance) {
    return ajvInstance;
  }
  try {
    if (isNodeEnvironment()) {
      ajvInstance = await nodeAjvLoader.load();
    } else if (isBrowserEnvironment()) {
      ajvInstance = await browserAjvLoader.load();
    } else {
      ajvInstance = await nodeAjvLoader.load();
    }
  } catch {
    ajvInstance = fallbackAjvLoader.load();
  }
  return ajvInstance;
}
// Cache compiled schema validators to avoid recompiling on each call
// WeakMap allows garbage collection of schema keys
const schemaCache = new WeakMap();

/**
 * Resolve a resource identifier to a fully qualified URL.
 *
 * @pseudocode
 * 1. When running in Node and given a relative path, convert `process.cwd()` to a `file:` URL and use as the base.
 * 2. Otherwise, resolve against the provided `base`, falling back to `getBaseUrl()` when none is supplied.
 * 3. Return a new `URL` object combining `url` with the chosen base.
 *
 * @param {string|URL} url - Resource location.
 * @param {string} [base] - Optional base URL for relative paths.
 * @returns {Promise<URL>} Resolved URL instance.
 */
export async function resolveUrl(url, base) {
  const urlStr = url.toString();
  // In Node with a relative path, resolve against CWD as a file URL.
  if (isNodeEnvironment() && !/^[a-zA-Z]+:/.test(urlStr) && !urlStr.startsWith("/")) {
    const { pathToFileURL } = await import("node:url");
    return new URL(urlStr, pathToFileURL(process.cwd() + "/").href);
  }
  const resolvedBase = base ?? getBaseUrl();
  return new URL(urlStr, resolvedBase);
}

/**
 * Read and parse JSON from a resolved URL.
 *
 * @pseudocode
 * 1. When the protocol is `file:` under Node, convert to a filesystem path and read the file.
 * 2. Otherwise, request the URL using `fetch` and parse the JSON response.
 * 3. On HTTP errors, throw with the original `url` and status code.
 *
 * @param {URL} parsedUrl - Previously resolved URL.
 * @param {string} originalUrl - Original URL string for error messages.
 * @returns {Promise<any>} Parsed JSON data.
 */
export async function readData(parsedUrl, originalUrl) {
  // In Node (including JSDOM test envs), prefer fs for file: URLs
  if (parsedUrl.protocol === "file:" && typeof process !== "undefined" && process?.versions?.node) {
    const { readFile } = await import("fs/promises");
    const { fileURLToPath } = await import("node:url");
    const filePath = fileURLToPath(parsedUrl.href);
    return JSON.parse(await readFile(filePath, "utf8"));
  }
  const response = await fetch(parsedUrl.href);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${originalUrl} (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Validate data against a schema and cache the result.
 *
 * @pseudocode
 * 1. When a `schema` is provided, ensure it is an object and validate `data` using `validateWithSchema`.
 * 2. Store `data` in the in-memory cache under `String(url)`.
 * 3. Return the cached data.
 *
 * @template T
 * @param {string|URL} url - Original resource identifier.
 * @param {T} data - Parsed JSON data.
 * @param {object} [schema] - Optional JSON schema used for validation.
 * @returns {Promise<T>} Validated data.
 */
export async function validateAndCache(url, data, schema) {
  if (schema) {
    if (typeof schema !== "object" || schema === null) {
      throw new Error("Invalid schema");
    }
    await validateWithSchema(data, schema);
  }
  dataCache.set(String(url), data);
  return data;
}

/**
 * Fetch JSON data with caching and optional schema validation.
 *
 * @pseudocode
 * 1. Log a debug message indicating `fetchJson` was called with the given `url`.
 * 2. Convert the `url` into a string `key` for caching purposes.
 * 3. Begin a `try...catch` block to handle potential errors during fetching and validation.
 * 4. Inside the `try` block:
 *    a. Check if the `dataCache` already contains an entry for the `key`. If yes, return the cached data immediately.
 *    b. Resolve the `url` into a fully qualified `parsedUrl` using `resolveUrl` and `getBaseUrl`.
 *    c. Read the data from the `parsedUrl` using `readData`, passing the original `key` for error messages.
 *    d. Validate the fetched `data` against the provided `schema` (if any) and cache the result using `validateAndCache`.
 *    e. Return the validated and cached data.
 * 5. In the `catch` block (if an error occurs):
 *    a. Remove any potentially stale or incomplete entry for the `key` from `dataCache`.
 *    b. Log a debug message indicating the error during fetching, including the `key` and the `error` object.
 *    c. Re-throw the `error` to allow higher-level code to handle it.
 *
 * @template T
 * @param {string|URL} url - Resource location.
 * @param {object} [schema] - Optional JSON schema used for validation.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 * @throws {Error} If the fetch request fails, validation fails, or JSON parsing fails.
 */
export async function fetchJson(url, schema) {
  debugLog(`fetchJson called with URL: ${url}`);
  const key = String(url);
  try {
    if (dataCache.has(key)) {
      return dataCache.get(key);
    }
    const parsedUrl = await resolveUrl(url, getBaseUrl());
    const data = await readData(parsedUrl, key);
    return await validateAndCache(key, data, schema);
  } catch (error) {
    dataCache.delete(key);
    // Reduce noisy console errors during tests/CI; still throw for callers to handle
    debugLog(`Error fetching ${key}:`, error);
    throw error;
  }
}

/**
 * Validates the provided data to ensure it is a non-null object.
 *
 * @pseudocode
 * 1. Verify that `data` is an object:
 *    - Use `typeof data` to check that the data is of type "object".
 *    - Ensure `data` is not `null`.
 *    - If validation fails, throw an error with a descriptive message.
 *
 * 2. For `judoka` type data:
 *    - Use `getMissingJudokaFields` to determine which fields are absent.
 *    - Throw an error listing the missing fields when any are found.
 *
 * @param {any} data - The data to validate.
 * @param {string} type - A descriptive name for the type of data being validated (e.g., "judoka", "country").
 * @throws {Error} If the `data` is not an object or is `null`.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function validateData(data, type) {
  if (typeof data !== "object" || data === null) {
    throw new Error(`Invalid or missing ${type} data.`);
  }

  if (type === "judoka") {
    const missingFields = getMissingJudokaFields(data);
    if (missingFields.length > 0) {
      throw new Error(`Invalid judoka data: Missing fields: ${missingFields.join(", ")}`);
    }
  }
}

/**
 * Validates data against a JSON schema using Ajv.
 *
 * @pseudocode
 * 1. Retrieve the Ajv instance by calling `getAjv()`.
 * 2. Check the cache for a compiled validator for the given `schema`.
 * 3. Compile the schema with Ajv and store it in the cache when needed.
 * 4. Validate `data` with the compiled function.
 *    - If validation fails, build an error message from `validate.errors`.
 *    - Throw an error including the validation details.
 *
 * @param {any} data - Data to validate.
 * @param {object} schema - JSON schema to validate against.
 * @throws {Error} If validation fails.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function validateWithSchema(data, schema) {
  const ajv = await getAjv();
  let validate = schemaCache.get(schema);
  if (!validate) {
    validate = ajv.compile(schema);
    schemaCache.set(schema, validate);
  }
  const valid = validate(data);
  if (!valid) {
    const message = ajv.errorsText(validate.errors);
    throw new Error(`Schema validation failed: ${message}`);
  }
}

/**
 * Dynamically import a JSON module with cross-version support.
 *
 * @pseudocode
 * 1. Try `import()` using the modern `with` attribute.
 * 2. If that fails, retry using the older `assert` syntax.
 * 3. Return the imported module's default export.
 *
 * @param {string} spec - Module path to import.
 * @returns {Promise<any>} Parsed JSON data.
 */
export async function importJsonModule(spec) {
  try {
    return (await import(spec, { with: { type: "json" } })).default;
  } catch {
    return (await import(spec, { assert: { type: "json" } })).default;
  }
}

export default {
  resolveUrl,
  readData,
  validateAndCache,
  fetchJson,
  validateData,
  validateWithSchema,
  importJsonModule,
  getAjv
};
