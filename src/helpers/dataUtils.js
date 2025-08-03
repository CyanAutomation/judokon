// In-memory cache for data fetched from URLs
const dataCache = new Map();

// Lazily instantiated Ajv singleton
let ajvInstance;

import { getMissingJudokaFields } from "./judokaValidation.js";

/**
 * Determine if the code is running in a Node environment.
 *
 * @pseudocode
 * 1. Check if `process.versions.node` exists using optional chaining.
 * 2. Return `true` when it exists; otherwise, return `false`.
 *
 * @returns {boolean} `true` if running under Node.
 */
function isNodeEnvironment() {
  return Boolean(typeof process !== "undefined" && process?.versions?.node);
}
/**
 * Lazily instantiate and return a singleton Ajv instance with format support.
 *
 * @pseudocode
 * 1. Return `ajvInstance` when it already exists.
 * 2. If running under Node:
 *    - Import `Ajv` and `ajv-formats`.
 *    - Create an Ajv instance and apply the formats.
 * 3. If running in a browser window:
 *    - Import the bundled Ajv v6 locally or from a CDN.
 * 4. Otherwise:
 *    - Import `Ajv` and `ajv-formats`, then apply the formats.
 * 5. Return the Ajv instance.
 *
 * @returns {Promise<import("ajv").default>} Ajv instance.
 */
export async function getAjv() {
  if (ajvInstance) {
    return ajvInstance;
  }
  if (isNodeEnvironment()) {
    const Ajv = (await import("ajv")).default;
    const addFormats = (await import("ajv-formats")).default;
    ajvInstance = new Ajv();
    addFormats(ajvInstance);
  } else if (typeof window !== "undefined") {
    try {
      const module = await import("../vendor/ajv6.min.js");
      ajvInstance = new module.default();
    } catch (error) {
      console.error("Error importing local AJV module:", error);
      const module = await import("https://esm.sh/ajv@6");
      ajvInstance = new module.default();
    }
  } else {
    const Ajv = (await import("ajv")).default;
    const addFormats = (await import("ajv-formats")).default;
    ajvInstance = new Ajv();
    addFormats(ajvInstance);
  }
  return ajvInstance;
}
// Cache compiled schema validators to avoid recompiling on each call
// WeakMap allows garbage collection of schema keys
const schemaCache = new WeakMap();

/**
 * Fetch JSON data with caching and optional schema validation.
 *
 * @pseudocode
 * 1. Check the cache for `url` and return the value when present.
 * 2. Request `url` using `fetch` and throw an error when the response is not OK.
 * 3. Parse the response with `response.json()`.
 * 4. When a `schema` is provided, validate the data with `validateWithSchema`.
 * 5. Store the parsed data in the cache and return it.
 * 6. On any error, log the issue, remove a stale cache entry, and rethrow.
 *
 * @template T
 * @param {string} url - The URL to fetch data from.
 * @param {object} [schema] - Optional JSON schema used for validation.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 * @throws {Error} If the fetch request fails, validation fails, or JSON parsing fails.
 */
export async function fetchJson(url, schema) {
  try {
    if (dataCache.has(url)) {
      return dataCache.get(url);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} (HTTP ${response.status})`);
    }

    const data = await response.json();
    if (schema) {
      await validateWithSchema(data, schema);
    }
    dataCache.set(url, data);
    return data;
  } catch (error) {
    dataCache.delete(url);
    console.error(`Error fetching ${url}:`, error);
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
  } catch (err) {
    return (await import(spec, { assert: { type: "json" } })).default;
  }
}
