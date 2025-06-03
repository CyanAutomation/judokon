/**
 * Fetches Aesop's Fables data from a JSON file.
 *
 * @pseudocode
 * 1. Send a GET request to retrieve the `aesopsFables.json` file using the `fetch` API.
 *    - Specify the relative path to the JSON file.
 *    - Await the server's response.
 *
 * 2. Verify the response status:
 *    - Check if `response.ok` is `true`.
 *    - If the response is not successful, throw an error with a descriptive message.
 *
 * 3. Parse the JSON response:
 *    - Convert the response body into a JavaScript object using `response.json()`.
 *
 * 4. Return the parsed JSON data.
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
 * @pseudocode
 * 1. Normalize newline characters:
 *    - Replace escaped newline characters (`\\n`) with actual newline characters (`\n`).
 *
 * 2. Split the story into paragraphs:
 *    - Use `.split(/\n{2,}/)` to divide the story into paragraphs based on double or more consecutive newlines.
 *    - Trim each paragraph and filter out empty paragraphs.
 *
 * 3. Format each paragraph:
 *    - Wrap each paragraph in `<p>` tags.
 *    - Replace single newline characters (`\n`) within paragraphs with `<br>` tags for line breaks.
 *
 * 4. Combine formatted paragraphs:
 *    - Join the paragraphs into a single HTML string.
 *
 * 5. Return the formatted story.
 *
 * @param {string} story - The fable's story text to format.
 * @returns {string} The formatted story with HTML tags for rendering.
 */
function formatFableStory(story) {
  story = story.replace(/\\n/g, "\n");

  return story
    .trim()
    .split(/\n{2,}/) // Split on 2+ newlines
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p><br>`)
    .join("");
}

/**
 * Displays a fable in the designated quote div on the page.
 *
 * @pseudocode
 * 1. Locate the quote div in the DOM:
 *    - Use `document.getElementById("quote")` to retrieve the element.
 *
 * 2. Check if a fable is provided:
 *    - If a fable is provided:
 *      a. Format the fable's story using `formatFableStory`.
 *      b. Update the quote div's inner HTML with the fable's title and formatted story.
 *    - If no fable is provided:
 *      a. Display a default congratulatory message in the quote div.
 *
 * 3. Update the quote div:
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
      <div class="quote-content" id="quote-content">${formattedStory}</div>
    `;
  } else {
    quoteDiv.innerHTML = "<p>Well done, congratulations!</p>";
  }
}

/**
 * Displays a random quote from Aesop's Fables in the designated quote div.
 *
 * @pseudocode
 * 1. Fetch the fables data:
 *    - Call `fetchFables` to retrieve the JSON data containing Aesop's Fables.
 *    - Handle any errors that occur during the fetch process.
 *
 * 2. Select a random fable:
 *    - Determine the maximum ID from the fables data.
 *    - Generate a random ID within the range of available IDs.
 *    - Find the fable corresponding to the random ID.
 *
 * 3. Display the fable:
 *    - If a fable is found, pass it to `displayFable` to update the quote div.
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
