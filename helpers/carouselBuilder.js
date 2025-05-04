import { generateJudokaCardHTML } from "./helpers/cardBuilder.js";

export async function renderCarousel() {
  const carousel = document.getElementById("carousel");

  try {
    // Fetch all judoka data
    const judokaData = await fetch("./data/judoka.json").then((res) => res.json());

    // Loop through each judoka and render a smaller card
    for (const judoka of judokaData) {
      const gokyoData = {}; // Pass an empty object or fetch gokyo data if needed
      const cardElement = await generateJudokaCardHTML(judoka, gokyoData);

      // Add a "small" class to the card container
      cardElement.classList.add("small");

      // Append the card to the carousel
      carousel.appendChild(cardElement);
    }

    console.log("Carousel rendered successfully.");
  } catch (error) {
    console.error("Error rendering carousel:", error);
  }
}