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

  async #buildTopBar(flagUrl) {
    return await safeGenerate(
      () => generateCardTopBar(this.judoka, flagUrl),
      "Failed to generate top bar:",
      createNoDataContainer()
    );
  }

  #buildPortraitSection() {
    return createPortraitSection(this.judoka);
  }

  async #buildStatsSection() {
    return await createStatsSection(this.judoka, this.cardType);
  }

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
