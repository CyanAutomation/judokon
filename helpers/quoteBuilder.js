/**
 * Fetches Aesop's Fables data from a JSON file.
 *
 * Pseudocode:
 * 1. Use the `fetch` API to retrieve the JSON file:
 *    - Specify the relative path to the `aesopsFables.json` file.
 *    - Await the response from the server.
 *
 * 2. Check if the response is successful:
 *    - Use `response.ok` to verify the HTTP status.
 *    - If the response is not successful, throw an error with a descriptive message.
 *
 * 3. Parse the JSON data:
 *    - Use `response.json()` to convert the response into a JavaScript object.
 *    - Return the parsed JSON data.
 *
 * @returns {Promise<Object[]>} A promise that resolves to an array of fables.
 * @throws {Error} If the fetch request fails or the response is not successful.
 */
async function fetchFables() {
  const response = await fetch("../data/aesopsFables.json");
  if (!response.ok) {
    throw new Error("Failed to fetch aesopsFables.json");
  }
  return response.json();
}

/**
 * Formats a fable's story by replacing newline characters with HTML tags for proper rendering.
 *
 * Pseudocode:
 * 1. Replace double newline characters (`\n\n`) with paragraph breaks:
 *    - Use `.replace(/\n\n/g, "</p><p><br>")` to convert double newlines into `<p>` tags with a `<br>` for spacing.
 *
 * 2. Replace single newline characters (`\n`) with line breaks:
 *    - Use `.replace(/\n/g, "<br>")` to convert single newlines into `<br>` tags for proper line breaks.
 *
 * 3. Return the formatted story:
 *    - Ensure the story is ready for rendering in HTML.
 *
 * @param {string} story - The fable's story text to format.
 * @returns {string} The formatted story with HTML tags for rendering.
 */
function formatFableStory(story) {
  return `<p>${story.replace(/\n\n/g, "</p><p><br>").replace(/\n/g, "<br>")}</p>`;
}

/**
 * Displays a fable in the designated quote div on the page.
 *
 * Pseudocode:
 * 1. Locate the quote div in the DOM:
 *    - Use `document.getElementById("quote")` to retrieve the element where the fable will be displayed.
 *
 * 2. Check if a fable is provided:
 *    - If a fable is provided:
 *      - Format the fable's story using the `formatFableStory` function.
 *      - Update the quote div's inner HTML with the fable's title and formatted story.
 *    - If no fable is provided:
 *      - Display a default congratulatory message in the quote div.
 *
 * 3. Ensure the quote div is updated with the appropriate content:
 *    - Use template literals to dynamically insert the fable's title and story into the HTML structure.
 *
 * @param {Object|null} fable - The fable object containing the title and story, or `null` if no fable is available.
 */
function displayFable(fable) {
  const quoteDiv = document.getElementById("quote");
  if (fable) {
    const formattedStory = formatFableStory(fable.story);
    quoteDiv.innerHTML = `
      <div class="quote-heading" id="quote-heading">${fable.title}</div>
      <div class="quote-content" id="quote-content"><p>${formattedStory}</p></div>
    `;
  } else {
    quoteDiv.innerHTML = "<p>Well done, congratulations!</p>";
  }
}

/**
 * Displays a random quote from Aesop's Fables in the designated quote div.
 *
 * Pseudocode:
 * 1. Fetch the fables data:
 *    - Call the `fetchFables` function to retrieve the JSON data containing Aesop's Fables.
 *    - Handle any errors that occur during the fetch process.
 *
 * 2. Select a random fable:
 *    - Determine the maximum ID from the fables data.
 *    - Generate a random ID within the range of available IDs.
 *    - Find the fable corresponding to the random ID.
 *
 * 3. Display the fable:
 *    - If a fable is found, pass it to the `displayFable` function to update the quote div.
 *    - If no fable is found or an error occurs, pass `null` to `displayFable` to display a default message.
 *
 * 4. Automatically call the function when the DOM is fully loaded:
 *    - Use the `DOMContentLoaded` event to ensure the function runs after the DOM is ready.
 *
 * @throws {Error} If fetching the fables data fails.
 */
async function displayRandomQuote() {
  try {
    const fables = await fetchFables();
    const maxId = Math.max(...fables.map((fable) => fable.id));
    const randomId = Math.floor(Math.random() * maxId) + 1;
    const randomFable = fables.find((fable) => fable.id === randomId);
    displayFable(randomFable);
  } catch (error) {
    console.error("Error fetching or displaying the fable:", error);
    displayFable(null);
  }
}

// Automatically call displayRandomQuote when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  displayRandomQuote();
});
