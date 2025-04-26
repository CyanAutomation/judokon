import {getValue} from "./utils"
import {Judoka, GokyoEntry} from "../types"

const PLACEHOLDER_PORTRAIT = "/judokaPortraits/judokaPortrait-0.png"

/**
 * Generates the portrait HTML for a judoka card.
 * @param judoka - The judoka object.
 * @returns The HTML string for the portrait.
 */
export function generateCardPortrait(judoka: Judoka | null | undefined): string {
  const portraitUrl =
    judoka && judoka.id ? `/judokaPortraits/judokaPortrait-${judoka.id}.png` : PLACEHOLDER_PORTRAIT

  return `
    <div class="card-portrait">
      <img src="${portraitUrl}" alt="${getValue(judoka?.name, "Judoka")} ${getValue(
        judoka?.surname,
        "",
      )}'s portrait" onerror="this.src='${PLACEHOLDER_PORTRAIT}'">
    </div>
  `
}

/**
 * Generates the stats HTML for a judoka card.
 * @param judoka - The judoka object.
 * @returns The HTML string for the stats.
 */
export function generateCardStats(judoka: Judoka | null | undefined): string {
  if (!judoka?.stats) return `<div class="card-stats">No stats available</div>`
  const {power = "?", speed = "?", technique = "?", kumiKata = "?", neWaza = "?"} = judoka.stats
  return `
    <div class="card-stats">
      <ul>
        <li class="stat"><strong>Power:</strong> <span>${power}</span></li>
        <li class="stat"><strong>Speed:</strong> <span>${speed}</span></li>
        <li class="stat"><strong>Technique:</strong> <span>${technique}</span></li>
        <li class="stat"><strong>Kumi-kata:</strong> <span>${kumiKata}</span></li>
        <li class="stat"><strong>Ne-waza:</strong> <span>${neWaza}</span></li>
      </ul>
    </div>
  `
}

/**
 * Generates the signature move HTML for a judoka card.
 * @param judoka - The judoka object.
 * @param gokyo - The array of techniques.
 * @returns The HTML string for the signature move.
 */
export function generateCardSignatureMove(
  judoka: Judoka | null | undefined,
  gokyo: GokyoEntry[] | null | undefined,
): string {
  const signatureMoveId = judoka?.signatureMoveId
  const technique = Array.isArray(gokyo) ? gokyo.find((move) => move.id === signatureMoveId) : null

  if (!technique) {
    console.warn(`No technique found for signatureMoveId: ${signatureMoveId}`)
  }

  const techniqueName = technique?.name ?? "Unknown"
  return `
    <div class="card-signature">
      <span class="signature-move-label"><strong>Signature Move:</strong></span>
      <span class="signature-move-value">${techniqueName}</span>
    </div>
  `
}
