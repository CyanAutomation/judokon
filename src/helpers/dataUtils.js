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
export function isNodeEnvironment() {
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
    if (window.Ajv) {
      ajvInstance = new window.Ajv();
    } else {
      try {
        const { default: Ajv } = await import("../vendor/ajv6.min.js");
        ajvInstance = new Ajv();
      } catch (localError) {
        try {
          const { default: Ajv } = await import("https://esm.sh/ajv@6");
          ajvInstance = new Ajv();
        } catch (cdnError) {
          console.error("Error loading Ajv:", localError, cdnError);
          const message = "Ajv import failed; validation disabled";
          ajvInstance = {
            errors: null,
            compile: () => {
              const validate = () => {
                const error = { message };
                ajvInstance.errors = [error];
                validate.errors = [error];
                return false;
              };
              return validate;
            },
            errorsText: () => message
          };
        }
      }
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
 * 2. Resolve the URL:
 *    - In Node, resolve relative paths against `process.cwd()`.
 *    - Otherwise resolve against `http://localhost`.
 * 3. When running under Node with a `file:` protocol, convert the file URL to a path and
 *    read and parse the file with `fs.promises.readFile`.
 * 4. Otherwise, request `parsedUrl.href` using `fetch` and parse the JSON response.
 * 5. When a `schema` is provided, validate the data with `validateWithSchema`.
 * 6. Store the parsed data in the cache and return it.
 * 7. On any error, log the issue, remove a stale cache entry, and rethrow.
 *
 * @template T
 * @param {string|URL} url - Resource location. Accepts absolute HTTP(S) URLs,
 *   `file:` URLs, or filesystem-relative paths when running under Node.
 *   Relative paths resolve against the current working directory and read
 *   from disk instead of over the network.
 * @param {object} [schema] - Optional JSON schema used for validation.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 * @throws {Error} If the fetch request fails, validation fails, or JSON parsing fails.
 */
export async function fetchJson(url, schema) {
  try {
    if (dataCache.has(url)) {
      return dataCache.get(url);
    }

    const base =
      isNodeEnvironment() && !/^[a-zA-Z]+:/.test(url) && !url.startsWith("/")
        ? (await import("node:url")).pathToFileURL(process.cwd() + "/").href
        : "http://localhost";
    const parsedUrl = new URL(url, base);
    let data;
    if (isNodeEnvironment() && parsedUrl.protocol === "file:") {
      const { readFile } = await import("fs/promises");
      const { fileURLToPath } = await import("node:url");
      const filePath = fileURLToPath(parsedUrl.href);
      data = JSON.parse(await readFile(filePath, "utf8"));
    } else {
      const response = await fetch(parsedUrl.href);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url} (HTTP ${response.status})`);
      }
      data = await response.json();
    }
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
  } catch {
    return (await import(spec, { assert: { type: "json" } })).default;
  }
}
