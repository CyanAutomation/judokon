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
    const cardType = processedJudoka.rarity?.toLowerCase() || "common";

    super("", { className: `judoka-card ${cardType}` });

    this.judoka = processedJudoka;
    this.gokyoLookup = gokyoLookup;
    this.enableInspector = enableInspector;
    this.cardType = cardType;

    this.element.setAttribute("role", "button");
    this.element.setAttribute("tabindex", "0");
    this.element.setAttribute("aria-label", `${this.judoka.firstname} ${this.judoka.surname} card`);
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
    const portrait = this.#buildPortraitSection();
    const stats = await this.#buildStatsSection();
    const signature = this.#buildSignatureMoveSection();

    card.append(topBar, portrait, stats, signature);
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
