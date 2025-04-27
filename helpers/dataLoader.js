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
 * @param {string} url - Path to the JSON file (e.g., './data/judoka.json').
 * @returns {Promise<any>} A promise that resolves to the parsed JSON data.
 */
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