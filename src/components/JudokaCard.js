import { getFlagUrl } from "../helpers/country/codes.js";
import { generateCardTopBar, createNoDataContainer } from "../helpers/cardTopBar.js";
import { safeGenerate } from "../helpers/errorUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "../helpers/judokaValidation.js";
import { enableCardFlip } from "../helpers/cardFlip.js";
import {
  createPortraitSection,
  createStatsSection,
  createSignatureMoveSection
} from "../helpers/cardSections.js";
import { createInspectorPanel } from "../helpers/inspector/createInspectorPanel.js";
import { Card } from "./Card.js";

/**
 * Component for rendering a judoka card.
 *
 * @pseudocode
 * 1. On construction validate `judoka` using `hasRequiredJudokaFields`.
 *    - Throw an error when required fields are missing.
 *    - Optionally obscure names and stats when `useObscuredStats` is true.
 * 2. Store judoka data, gokyo lookup and options for later use.
 * 3. `render()` builds the DOM structure:
 *    - Resolve the flag URL using `safeGenerate(getFlagUrl)`.
 *    - Create a `.card-container` and inner `.judoka-card` element.
 *    - Build top bar, portrait, stats and signature move sections.
 *    - Enable flip interactivity with `enableCardFlip`.
 *    - Append an inspector panel when enabled.
 *    - Return the container element.
 */
export class JudokaCard extends Card {
  /**
   * @param {import("../helpers/types.js").Judoka} judoka - Judoka data.
   * @param {Record<number, import("../helpers/types.js").GokyoEntry>} gokyoLookup - Move lookup.
   * @param {{useObscuredStats?: boolean, enableInspector?: boolean}} [options] - Render options.
   */
  constructor(judoka, gokyoLookup, options = {}) {
    if (!hasRequiredJudokaFields(judoka)) {
      const missing = getMissingJudokaFields(judoka).join(", ");
      throw new Error(`Invalid Judoka object: Missing required fields: ${missing}`);
    }
    if (!gokyoLookup) {
      throw new Error("Missing gokyo lookup");
    }

    const { useObscuredStats = false, enableInspector = false } = options;
    const processedJudoka = useObscuredStats ? JudokaCard.#obscureJudoka(judoka) : judoka;
    // Detect Mystery card: prefer stable id=1
    const isMystery = Number(judoka?.id) === 1;
    // Force common type for simplified Mystery layout to match design decision
    const cardType = isMystery ? "common" : processedJudoka.rarity?.toLowerCase() || "common";

    super("", { className: `judoka-card ${cardType}` });

    this.judoka = processedJudoka;
    this.gokyoLookup = gokyoLookup;
    this.enableInspector = enableInspector;
    this.cardType = cardType;
    this.isMysteryCard = isMystery && useObscuredStats;

    this.element.setAttribute("role", "button");
    this.element.setAttribute("tabindex", "0");
    // Accessible label: override for Mystery card
    const ariaLabel = this.isMysteryCard
      ? "Mystery Judoka: hidden card"
      : `${this.judoka.firstname} ${this.judoka.surname} card`;
    this.element.setAttribute("aria-label", ariaLabel);
    this.element.classList.add(this.judoka.gender === "female" ? "female-card" : "male-card");
  }

  /**
   * Obscures sensitive judoka data (firstname, surname, and stats) for display purposes.
   *
   * @pseudocode
   * 1. Create a deep clone of the judoka object.
   * 2. Replace the firstname and surname with '?'.
   * 3. If stats exist and are an object, replace each stat value with '?'.
   * 4. Return the obscured clone.
   *
   * @param {import("../helpers/types.js").Judoka} judoka - The judoka object to obscure.
   * @returns {import("../helpers/types.js").Judoka} A new judoka object with sensitive data obscured.
   */
  static #obscureJudoka(judoka) {
    const clone = structuredClone(judoka);
    clone.firstname = "?";
    clone.surname = "?";
    if (clone.stats && typeof clone.stats === "object") {
      for (const key of Object.keys(clone.stats)) {
        clone.stats[key] = "?";
      }
    }
    return clone;
  }

  /**
   * Asynchronously builds the top bar section of the judoka card.
   *
   * @pseudocode
   * 1. Use `safeGenerate` to create the card top bar using judoka data and flag URL.
   * 2. Provide error handling and a fallback container if generation fails.
   *
   * @param {string} flagUrl - The URL for the judoka's country flag.
   * @returns {Promise<HTMLElement>} A promise that resolves with the top bar HTMLElement.
   */
  async #buildTopBar(flagUrl) {
    return await safeGenerate(
      () => generateCardTopBar(this.judoka, flagUrl),
      "Failed to generate top bar:",
      createNoDataContainer()
    );
  }

  /**
   * Builds the portrait section of the judoka card.
   *
   * @pseudocode
   * 1. Create the portrait section using the judoka data.
   *
   * @returns {HTMLElement} The portrait section HTMLElement.
   */
  #buildPortraitSection() {
    return createPortraitSection(this.judoka);
  }

  /**
   * Asynchronously builds the stats section of the judoka card.
   *
   * @pseudocode
   * 1. Create the stats section using the judoka data and card type.
   *
   * @returns {Promise<HTMLElement>} A promise that resolves with the stats section HTMLElement.
   */
  async #buildStatsSection() {
    return await createStatsSection(this.judoka, this.cardType);
  }

  /**
   * Builds the signature move section of the judoka card.
   *
   * @pseudocode
   * 1. Create the signature move section using judoka data, gokyo lookup, and card type.
   *
   * @returns {HTMLElement} The signature move section HTMLElement.
   */
  #buildSignatureMoveSection() {
    return createSignatureMoveSection(this.judoka, this.gokyoLookup, this.cardType);
  }

  /**
   * Build the simplified Mystery section with a large question mark SVG.
   *
   * @pseudocode
   * 1. Create a container with class `mystery-section` and aria-label.
   * 2. Insert provided SVG using the given path and a 960 viewBox.
   * 3. Return the element.
   *
   * @returns {HTMLElement}
   */
  #buildMysterySection() {
    const section = document.createElement("div");
    section.className = "mystery-section";
    section.setAttribute("role", "img");
    section.setAttribute("aria-label", "Mystery card icon");
    section.innerHTML = `
      <svg viewBox="0 0 960 960" aria-hidden="true" focusable="false">
        <path d="M424-320q0-81 14.5-116.5T500-514q41-36 62.5-62.5T584-637q0-41-27.5-68T480-732q-51 0-77.5 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.5 58.5T698-641q0 50-21.5 85.5T609-475q-49 47-59.5 71.5T539-320H424Zm56 240q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Z" />
      </svg>
    `;
    return section;
  }

  /**
   * Render the card and return the container element.
   *
   * @returns {Promise<HTMLElement>} Resolves with the card container element.
   */
  async render() {
    const container = document.createElement("div");
    container.className = "card-container";
    try {
      container.dataset.cardJson = JSON.stringify(this.judoka);
    } catch {
      // ignore serialization errors
    }

    const flagUrl = await safeGenerate(
      () => getFlagUrl(this.judoka.countryCode || "vu"),
      "Failed to resolve flag URL:",
      "https://flagcdn.com/w320/vu.png"
    );

    const card = this.element;
    const topBar = await this.#buildTopBar(flagUrl);
    card.append(topBar);

    if (this.isMysteryCard) {
      // Simplified layout: large SVG only, spanning remaining rows
      const mystery = this.#buildMysterySection();
      card.append(mystery);
    } else {
      const portrait = this.#buildPortraitSection();
      const stats = await this.#buildStatsSection();
      const signature = this.#buildSignatureMoveSection();
      card.append(portrait, stats, signature);
    }
    enableCardFlip(card);
    container.appendChild(card);

    if (this.enableInspector) {
      const panel = createInspectorPanel(container, this.judoka);
      container.appendChild(panel);
    }

    return container;
  }
}

export default JudokaCard;
