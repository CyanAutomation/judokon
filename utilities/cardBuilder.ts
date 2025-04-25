import {formatDate, escapeHTML, getValue} from "./utils.ts"
import {getFlagUrl} from "./countryUtils.ts"
import {generateCardTopBar} from "./cardTopBar.ts"
import {generateCardPortrait, generateCardStats, generateCardSignatureMove} from "./cardRender.js"

interface Judoka {
  countryCode: string;
  lastUpdated: string;
  [key: string]: any; // to accommodate other fields used in rendering
}

interface Technique {
  id: string;
  name: string;
}

/**
 * Generates the "last updated" HTML for a judoka card.
 * @param {string} date
 * @returns {string}
 */
function generateCardLastUpdated(date: string): string {
  return `<div class="card-updated">Last updated: ${escapeHTML(date)}</div>`;
}

/**
 * Generates the complete HTML for a judoka card.
 * @param {Judoka} judoka
 * @param {Technique[]} gokyo
 * @returns {string}
 */
export function generateJudokaCardHTML(judoka: Judoka, gokyo: Technique[]): string {
  const flagUrl = getFlagUrl(judoka.countryCode);
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
