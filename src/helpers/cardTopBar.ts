import {escapeHTML, getValue} from "./utils"
import {getCountryNameFromCode} from "./countryUtils"
import {Judoka} from "../types"

const PLACEHOLDER_FLAG: string = "/countryFlags/placeholder-flag.png"

/**
 * Generates the top bar HTML for a judoka card, including name and flag.
 * @param judoka - The judoka object.
 * @param flagUrl - The URL of the flag image.
 * @returns An object with title, flagUrl, and html properties.
 */
export function generateCardTopBar(
  judoka: Judoka | null | undefined,
  flagUrl?: string,
): {title: string; flagUrl: string; html: string} {
  if (!judoka) {
    console.error("Judoka object is missing!")
    return {
      title: "No data",
      flagUrl: PLACEHOLDER_FLAG,
      html: `<div class="card-top-bar">No data available</div>`,
    }
  }

  const firstname = escapeHTML(getValue(judoka.name, "Unknown"))
  const surname = escapeHTML(getValue(judoka.surname, ""))
  const countryCode = getValue(judoka.country, "")
  const countryName = getCountryNameFromCode(countryCode)

  const fullTitle = `${firstname} ${surname}`.trim()
  const finalFlagUrl = flagUrl || PLACEHOLDER_FLAG

  return {
    title: fullTitle,
    flagUrl: finalFlagUrl,
    html: `
      <div class="card-top-bar">
        <div class="card-name">
          <span class="firstname">${firstname}</span>
          <span class="surname">${surname}</span>
        </div>
        <img class="card-flag" src="${finalFlagUrl}" alt="${countryName} flag" 
          onerror="this.src='${PLACEHOLDER_FLAG}'">
      </div>
    `,
  }
}
