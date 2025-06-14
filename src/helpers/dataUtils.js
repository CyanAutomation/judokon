/**
 * Generic function to load any JSON file from a given URL.
 *
 * @pseudocode
 * 1. Send a GET request to the specified `url` using the `fetch` API.
 *    - If the response status is not OK (`response.ok` is false), throw an error with the HTTP status code.
 *
 * 2. Parse the response body as JSON:
 *    - Convert the response body into a JavaScript object using `response.json()`.
 *
 * 3. Validate the parsed data when a `schema` is provided:
 *    - Use `validateWithSchema` to ensure the data matches the schema.
 *
 * 4. Return the parsed JSON data.
 *
 * 5. Handle errors:
 *    - Log any errors encountered during the fetch or JSON parsing to the console.
 *    - Rethrow the error to allow the caller to handle it.
 *
 * @template T
 * @param {string} url - Path to the JSON file (e.g., `${DATA_DIR}judoka.json`).
 * @param {object} [schema] - Optional JSON schema to validate the data.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 */
// In-memory cache for data fetched from URLs
const dataCache = new Map();

// Lazily instantiated Ajv singleton
let ajvInstance;

/**
 * Determine if the code is running in a Node environment.
 *
 * @pseudocode
 * 1. Verify that `process` is defined.
 * 2. Confirm `process.versions.node` exists.
 * 3. Return `true` when both checks succeed.
 *
 * @returns {boolean} `true` if running under Node.
 */
function isNodeEnvironment() {
  return typeof process !== "undefined" && process.versions && process.versions.node;
}

export async function getAjv() {
  if (ajvInstance) {
    return ajvInstance;
  }
  if (isNodeEnvironment()) {
    const Ajv = (await import("ajv")).default;
    ajvInstance = new Ajv();
  } else if (typeof window !== "undefined") {
    const module = await import("https://esm.sh/ajv@6");
    ajvInstance = new module.default();
  } else {
    const Ajv = (await import("ajv")).default;
    ajvInstance = new Ajv();
  }
  return ajvInstance;
}
// Cache compiled schema validators to avoid recompiling on each call
// WeakMap allows garbage collection of schema keys
const schemaCache = new WeakMap();

export async function loadJSON(url, schema) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url} (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (schema) {
      await validateWithSchema(data, schema);
    }
    return data;
  } catch (error) {
    console.error(`Error loading ${url}:`, error);
    throw error;
  }
}

/**
 * Fetches data from a given URL with error handling.
 *
 * @pseudocode
 * 1. Send a GET request to the specified `url` using the `fetch` API.
 *    - If the response status is not OK (`response.ok` is false), throw an error with the HTTP status code.
 *
 * 2. Parse the response body as JSON:
 *    - Convert the response body into a JavaScript object using `response.json()`.
 *
 * 3. Validate the parsed data when a `schema` is provided:
 *    - Use `validateWithSchema` to ensure the data matches the schema.
 *
 * 4. Return the parsed JSON data.
 *
 * 5. Handle errors:
 *    - Log any errors encountered during the fetch or JSON parsing to the console.
 *    - Rethrow the error to allow the caller to handle it.
 *
 * @template T
 * @param {string} url - The URL to fetch data from.
 * @param {object} [schema] - Optional JSON schema to validate the data.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 * @throws {Error} If the fetch request fails or the response is not OK.
 */
export async function fetchDataWithErrorHandling(url, schema) {
  try {
    if (dataCache.has(url)) {
      return dataCache.get(url);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url} (HTTP ${response.status})`);
    }

    const json = await response.json();
    if (schema) {
      await validateWithSchema(json, schema);
    }
    dataCache.set(url, json);
    return json;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
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
 *    - Define required fields: `firstname`, `surname`, `country`, `stats`, `signatureMoveId`.
 *    - Check for missing fields using `filter`.
 *    - If any required fields are missing, throw an error listing the missing fields.
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
    const requiredFields = ["firstname", "surname", "country", "stats", "signatureMoveId"];
    const missingFields = requiredFields.filter((field) => !data[field]);
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
