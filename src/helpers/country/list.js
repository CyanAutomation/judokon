import { DATA_DIR } from "../constants.js";
import { loadCountryCodeMapping, getFlagUrl } from "./codes.js";

const SCROLL_THRESHOLD_PX = 50;

export async function populateCountryList(container) {
  try {
    const judokaResponse = await fetch(`${DATA_DIR}judoka.json`);
    if (!judokaResponse.ok) {
      throw new Error("Failed to load judoka data");
    }
    const judoka = await judokaResponse.json();
    const uniqueCountries = new Set(
      Array.isArray(judoka) ? judoka.map((j) => j.country).filter(Boolean) : []
    );
    const countryData = await loadCountryCodeMapping();
    const activeCountries = [...uniqueCountries]
      .map((name) =>
        countryData.find((entry) => entry.country === name && entry.active)
      )
      .filter(Boolean)
      .sort((a, b) => a.country.localeCompare(b.country));
    const allButton = document.createElement("button");
    allButton.className = "flag-button slide";
    allButton.value = "all";
    allButton.setAttribute("aria-label", "Show all countries");
    const allImg = document.createElement("img");
    allImg.alt = "All countries";
    allImg.className = "flag-image";
    allImg.src = "https://flagcdn.com/w320/vu.png";
    const allLabel = document.createElement("p");
    allLabel.textContent = "All";
    allButton.appendChild(allImg);
    allButton.appendChild(allLabel);
    container.appendChild(allButton);
    const scrollContainer = container.parentElement || container;
    const BATCH_SIZE = 50;
    let rendered = 0;
    const renderBatch = async () => {
      const batch = activeCountries.slice(rendered, rendered + BATCH_SIZE);
      for (const country of batch) {
        if (!country.country || !country.code) {
          console.warn("Skipping invalid country entry:", country);
          continue;
        }
        const button = document.createElement("button");
        button.className = "flag-button slide";
        button.value = country.country;
        button.setAttribute("aria-label", `Filter by ${country.country}`);
        const flagImg = document.createElement("img");
        flagImg.alt = `${country.country} Flag`;
        flagImg.className = "flag-image";
        try {
          const flagUrl = await getFlagUrl(country.code);
          flagImg.src = flagUrl;
        } catch (error) {
          console.warn(`Failed to load flag for ${country.country}:`, error);
          flagImg.src = "https://flagcdn.com/w320/vu.png";
        }
        const countryName = document.createElement("p");
        countryName.textContent = country.country;
        button.appendChild(flagImg);
        button.appendChild(countryName);
        container.appendChild(button);
      }
      rendered += batch.length;
    };
    await renderBatch();
    if (activeCountries.length > rendered) {
      const handleScroll = async () => {
        if (
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - SCROLL_THRESHOLD_PX
        ) {
          await renderBatch();
          if (rendered >= activeCountries.length) {
            scrollContainer.removeEventListener("scroll", handleScroll);
          }
        }
      };
      scrollContainer.addEventListener("scroll", handleScroll);
    }
  } catch (error) {
    console.error("Error fetching country data:", error);
  }
}
