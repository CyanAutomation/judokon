import {formatDate, escapeHTML, getValue} from "./utils.ts"
import {getFlagUrl} from "./countryUtils.ts"
import {generateCardTopBar} from "./cardTopBar.ts"
import {generateCardPortrait, generateCardStats, generateCardSignatureMove} from "./cardRender.js"

/**
 * Generates the "last updated" HTML for a judoka card.
 * @param {string} date
 * @returns {string}
 */
function generateCardLastUpdated(date) {
  return `<div class="card-updated">Last updated: ${escapeHTML(date)}</div>`
}

/**
 * Generates the complete HTML for a judoka card.
 * @param {Object} judoka
 * @param {Array} gokyo
 * @returns {string}
 */
export function generateJudokaCardHTML(judoka, gokyo) {
  const flagUrl = getFlagUrl(judoka.countryCode)
  const lastUpdated = formatDate(judoka.lastUpdated)

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
  `
}
