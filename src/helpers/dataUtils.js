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
 * 3. Return the parsed JSON data.
 *
 * 4. Handle errors:
 *    - Log any errors encountered during the fetch or JSON parsing to the console.
 *    - Rethrow the error to allow the caller to handle it.
 *
 * @template T
 * @param {string} url - Path to the JSON file (e.g., './src/data/judoka.json').
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 */
// In-memory cache for data fetched from URLs
const dataCache = new Map();

export async function loadJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url} (HTTP ${response.status})`);
    }
    return await response.json();
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
 * 3. Return the parsed JSON data.
 *
 * 4. Handle errors:
 *    - Log any errors encountered during the fetch or JSON parsing to the console.
 *    - Rethrow the error to allow the caller to handle it.
 *
 * @template T
 * @param {string} url - The URL to fetch data from.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 * @throws {Error} If the fetch request fails or the response is not OK.
 */
export async function fetchDataWithErrorHandling(url) {
  try {
    if (url in dataCache) {
      return dataCache[url];
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url} (HTTP ${response.status})`);
    }

    const json = await response.json();
    dataCache[url] = json;
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
