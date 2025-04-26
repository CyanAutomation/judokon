import { formatDate, escapeHTML, getValue } from "./utils";
import { getFlagUrl } from "./countryUtils";
import { generateCardTopBar } from "./cardTopBar";
import { generateCardPortrait, generateCardStats, generateCardSignatureMove } from "./cardRender";
import { Judoka, GokyoEntry } from "../types";

/**
 * Generates the "last updated" HTML for a judoka card.
 * @param date - The last updated date as a string.
 * @returns The HTML string for the "last updated" section.
 */
function generateCardLastUpdated(date: string): string {
  return `<div class="card-updated">Last updated: ${escapeHTML(date)}</div>`;
}

/**
 * Generates the complete HTML for a judoka card.
 * @param judoka - The judoka object.
 * @param gokyo - The array of Gokyo entries (techniques).
 * @returns The complete HTML string for the judoka card.
 */
export function generateJudokaCardHTML(judoka: Judoka, gokyo: GokyoEntry[]): string {
  const flagUrl = getFlagUrl(judoka.country);
  const lastUpdated = formatDate(judoka.lastUpdated);

  return `
    <div class="card-container">
      <div class="judoka-card">
        ${generateCardTopBar(judoka, flagUrl).html}
        ${generateCardPortrait(judoka)}
        ${generateCardStats(judoka)}
        ${generateCardSignatureMove(judoka, gokyo)}
        ${generateCardLastUpdated(lastUpdated)}
      </div>
    </div>
  `;
}