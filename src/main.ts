// Import utility functions for generating flag URLs and judoka card HTML
import { generateJudokaCardHTML } from "./helpers/cardBuilder";
import "../src/styles/style.css";

// Define interfaces for Judoka and GokyoEntry
interface Judoka {
  id: string;
  name: string;
  countryCode: string;
  signatureMoveId?: string;
}

interface GokyoEntry {
  id: string;
  name: string;
}

// Wait for the DOM to fully load before executing the script
document.addEventListener("DOMContentLoaded", () => {
  // Select DOM elements for the start button, game area, and loading indicator
  const startBtn = document.getElementById("startBtn") as HTMLButtonElement | null;
  const gameArea = document.getElementById("gameArea") as HTMLElement | null;
  const loadingIndicator = document.getElementById("loading") as HTMLElement | null;

  if (!startBtn || !gameArea || !loadingIndicator) {
    console.error("Required DOM elements are missing.");
    return;
  }

  // Add a click event listener to the "Start Game" button
  startBtn.addEventListener("click", async () => {
    console.log("Start button clicked!");
    startBtn.classList.add("hidden");
    gameArea.innerHTML = ""; // Clear the game area
    loadingIndicator.classList.remove("hidden");

    try {
      // Fetch the judoka and gokyo data
      const judokaData = await fetchDataWithErrorHandling<Judoka[]>("data/judoka.json");
      const gokyoData = await fetchDataWithErrorHandling<GokyoEntry[]>("data/gokyo.json");

      console.log("Judoka data fetched:", judokaData);
      console.log("Gokyo data fetched:", gokyoData);

      // Select a random judoka from the data
      const selectedJudoka = getRandomJudoka(judokaData);
      console.log("Selected judoka:", selectedJudoka);

      // Display the selected judoka's card
      displayJudokaCard(selectedJudoka, gokyoData);
    } catch (error) {
      console.error("Error loading card:", error);
      gameArea.innerHTML = `<p>⚠️ Failed to load card. Please try again later.</p>`;
    } finally {
      loadingIndicator.classList.add("hidden");
      gameArea.classList.remove("hidden");
    }
  });

  /**
   * Fetches data from a given URL and parses it as JSON with error handling.
   * @param url - The URL to fetch data from.
   * @returns The parsed JSON data.
   */
  async function fetchDataWithErrorHandling<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch data from ${url}:`, error);
      throw new Error(`Failed to fetch data from ${url}`);
    }
  }

  /**
   * Selects a random judoka from the data.
   * @param data - The array of judoka data.
   * @returns A random judoka object.
   */
  function getRandomJudoka(data: Judoka[]): Judoka {
    const index = Math.floor(Math.random() * data.length);
    console.log("Random index:", index);
    return data[index];
  }

  /**
   * Displays the selected judoka's card in the game area.
   * @param judoka - The selected judoka object.
   * @param gokyo - The array of Gokyo entries.
   */
  function displayJudokaCard(judoka: Judoka, gokyo: GokyoEntry[]): void {
    console.log("Judoka passed to displayJudokaCard:", judoka);
    if (!gameArea) {
      console.error("Game area is not available.");
      return;
    }
    gameArea.innerHTML = generateJudokaCardHTML(judoka, gokyo);
  }
});