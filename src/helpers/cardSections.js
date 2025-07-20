import { generateCardPortrait, generateCardSignatureMove } from "./cardRender.js";
import { createStatsPanel } from "../components/StatsPanel.js";
import { createNoDataContainer } from "./cardTopBar.js";

export function createPortraitSection(judoka) {
  try {
    const fragment = document.createRange().createContextualFragment(generateCardPortrait(judoka));
    const portraitElement = fragment.firstElementChild;

    const weightClassElement = document.createElement("div");
    weightClassElement.className = "card-weight-class";
    weightClassElement.textContent = judoka.weightClass;
    portraitElement.appendChild(weightClassElement);

    return portraitElement;
  } catch (error) {
    console.error("Failed to generate portrait:", error);
    return createNoDataContainer();
  }
}

export function createStatsSection(judoka, cardType) {
  try {
    return createStatsPanel(judoka.stats, { type: cardType });
  } catch (error) {
    console.error("Failed to generate stats:", error);
    return createNoDataContainer();
  }
}

export function createSignatureMoveSection(judoka, gokyoLookup, cardType) {
  try {
    const signatureMoveHTML = generateCardSignatureMove(judoka, gokyoLookup, cardType);
    const fragment = document.createRange().createContextualFragment(signatureMoveHTML);
    return fragment.firstElementChild;
  } catch (error) {
    console.error("Failed to generate signature move:", error);
    return createNoDataContainer();
  }
}
