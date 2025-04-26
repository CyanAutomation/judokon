import {formatDate, escapeHTML, getValue} from "./utils"
import {getFlagUrl} from "./countryUtils"
import {generateCardTopBar} from "./cardTopBar"
import {generateCardPortrait, generateCardStats, generateCardSignatureMove} from "./cardRender"
import {Judoka, GokyoEntry} from "../types"

/**
 * Generates the "last updated" HTML for a judoka card.
 * @param date - The last updated date as a string or Date.
 * @returns The HTML string for the "last updated" section.
 */
function generateCardLastUpdated(date: string | Date | undefined): string {
  if (!date) return "" // If date is undefined, don't render anything
  const safeDate = date instanceof Date ? date.toISOString().split("T")[0] : date
  return `<div class="card-updated">Last updated: ${escapeHTML(safeDate)}</div>`
}

/**
 * Validates the required fields of a Judoka object.
 * @param judoka - The judoka object to validate.
 */
function validateJudoka(judoka: Judoka): void {
  if (!judoka.name || !judoka.surname || !judoka.country) {
    throw new Error("Invalid Judoka object: Missing required fields.")
  }
}

/**
 * Generates the complete HTML for a judoka card.
 * @param judoka - The judoka object.
 * @param gokyo - The array of Gokyo entries (techniques).
 * @returns The complete HTML string for the judoka card.
 */
export function generateJudokaCardHTML(judoka: Judoka, gokyo: GokyoEntry[]): string {
  // Validate the Judoka object
  validateJudoka(judoka)

  // Generate the flag URL
  const flagUrl = getFlagUrl(judoka.country)

  // Ensure lastUpdated is a string before passing it to formatDate
  const lastUpdated =
    typeof judoka.lastUpdated === "string"
      ? judoka.lastUpdated
      : judoka.lastUpdated?.toISOString().split("T")[0] || ""

  // Generate the complete HTML
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
