import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

/**
 * Retrieves the fallback judoka data (the entry with `id: 0`) from `judoka.json`.
 *
 * @summary This function provides a default judoka profile to be used when
 * other judoka data cannot be loaded or is unavailable. It caches the result
 * for subsequent calls.
 *
 * @pseudocode
 * 1. Check if `cachedFallback` already holds the judoka data. If yes, return it immediately.
 * 2. Attempt to fetch `judoka.json` using `fetchJson`.
 * 3. If the fetch is successful and the data is an array, find the judoka entry where `id` is `0`.
 * 4. If the entry with `id: 0` is found, cache it in `cachedFallback` and return it.
 * 5. If the entry is not found in the fetched data, throw an error indicating its absence.
 * 6. If any error occurs during fetching or finding the judoka (including the error from step 5):
 *    a. Log the error to the console.
 *    b. Assign a hard-coded, predefined fallback judoka object to `cachedFallback`.
 *    c. Return the hard-coded `cachedFallback` object.
 *
 * @returns {Promise<Judoka>} A promise that resolves to the fallback judoka object.
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
