import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

/**
 * Retrieve the fallback judoka (id `0`) from `judoka.json`.
 *
 * @pseudocode
 * 1. Return the cached value when available.
 * 2. Fetch `judoka.json` and locate the entry with `id` `0`.
 *    - Cache and return this entry when found.
 * 3. On error, log the issue and return a hard-coded object
 *    identical to the entry in `judoka.json`.
 *
 * @returns {Promise<Judoka>} A promise that resolves to the fallback judoka.
 */
let cachedFallback;
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function getFallbackJudoka() {
  if (cachedFallback) {
    return cachedFallback;
  }
  try {
    const data = await fetchJson(`${DATA_DIR}judoka.json`);
    if (Array.isArray(data)) {
      const entry = data.find((j) => j.id === 0);
      if (entry) {
        cachedFallback = entry;
        return entry;
      }
    }
    throw new Error("Fallback judoka with id 0 not found");
  } catch (error) {
    console.error("Failed to load fallback judoka:", error);
    cachedFallback = {
      id: 0,
      firstname: "Tatsuuma",
      surname: "Ushiyama",
      country: "Vanuatu",
      countryCode: "vu",
      weightClass: "+100",
      stats: { power: 9, speed: 9, technique: 9, kumikata: 9, newaza: 9 },
      signatureMoveId: 0,
      lastUpdated: "2025-04-22T10:00:00Z",
      profileUrl: "https://goldenkamuy.fandom.com/wiki/Tatsuuma_Ushiyama",
      bio: "Tatsuuma Ushiyama (\u725b\u5c71 \u8fbb\u99ac, Ushiyama Tatsuuma), also known as Ushiyama the Undefeated (\u4e0d\u6557\u306e\u725b\u5c71, Fuhai no Ushiyama), is one of the Abashiri Convicts. He is a master judoka and one of the strongest and most dangerous fighters in Hokkaido.",
      gender: "male",
      isHidden: true,
      rarity: "Legendary",
      cardCode: "WKZ3-H4NF-MXT2-LQ93-JT8C",
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0
    };
    return cachedFallback;
  }
}
