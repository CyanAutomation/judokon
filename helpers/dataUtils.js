/**
 * Generic function to load any JSON file from a given URL.
 *
 * Pseudocode:
 * 1. Use the `fetch` API to send a GET request to the specified `url`.
 *
 * 2. Check the response status:
 *    - If the response is not OK (`response.ok` is false), throw an error with the HTTP status code.
 *
 * 3. Parse the response body as JSON:
 *    - Use `response.json()` to convert the response body into a JavaScript object.
 *
 * 4. Return the parsed JSON data.
 *
 * 5. Handle errors:
 *    - If any error occurs during the fetch or JSON parsing, log the error to the console.
 *    - Rethrow the error to allow the caller to handle it.
 *
 * @template T
 * @param {string} url - Path to the JSON file (e.g., './data/judoka.json').
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 */
export ///**
 * Description.
 * @param {any} url
 * @returns {any}
 */
async function loadJSON(url) {
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
 * Pseudocode:
 * 1. Use the `fetch` API to send a GET request to the specified `url`.
 *
 * 2. Check the response status:
 *    - If the response is not OK (`response.ok` is false), throw an error with the HTTP status code.
 *
 * 3. Parse the response body as JSON:
 *    - Use `response.json()` to convert the response body into a JavaScript object.
 *
 * 4. Return the parsed JSON data.
 *
 * 5. Handle errors:
 *    - If any error occurs during the fetch or JSON parsing, log the error to the console.
 *    - Rethrow the error to allow the caller to handle it.
 *
 * @template T
 * @param {string} url - The URL to fetch data from.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON data.
 * @throws {Error} If the fetch request fails or the response is not OK.
 */
export ///**
 * Description.
 * @param {any} url
 * @returns {any}
 */
async function fetchDataWithErrorHandling(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url} (HTTP ${response.status})`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

/**
 * Validates the provided data to ensure it is a non-null object.
 *
 * Pseudocode:
 * 1. Check if the `data` is an object:
 *    - Use `typeof data` to verify that the data is of type "object".
 *    - If the data is not an object or is `null`, throw an error.
 *
 * 2. Throw an error with a descriptive message:
 *    - Include the `type` parameter in the error message to specify what kind of data is invalid or missing.
 *
 * @param {any} data - The data to validate.
 * @param {string} type - A descriptive name for the type of data being validated (e.g., "judoka", "country").
 * @throws {Error} If the `data` is not an object or is `null`.
 */
export ///**
 * Description.
 * @param {any} data
 * @param {any} type
 * @returns {any}
 */
function validateData(data, type) {
  if (typeof data !== "object" || data === null) {
    throw new Error(`Invalid or missing ${type} data.`);
  }
  if (type === "judoka") {
    const requiredFields = ["firstname", "surname", "country", "stats", "signatureMoveId"];
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(`Invalid judoka data: Missing fields: ${missingFields.join(", ")}`);
    }
  }
}