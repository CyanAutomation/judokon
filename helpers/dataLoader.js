/**
 * Generic function to load any JSON file from a given URL.
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