/**
 * @typedef {Object} Judoka
 * @property {string|number} id - Unique identifier for the judoka (number for internal use, string for external references)
 * @property {string} firstname - First name of the judoka
 * @property {string} surname - Last name of the judoka
 * @property {string} country - Full country name (e.g., "Portugal")
 * @property {string} countryCode - 2-letter country code (e.g., "PT")
 * @property {string} weightClass - Weight class (e.g., "-52kg")
 * @property {Object} stats - Judoka's stats (all ratings are between 1 and 10)
 * @property {number} stats.power - Power rating (1-10)
 * @property {number} stats.speed - Speed rating (1-10)
 * @property {number} stats.technique - Technique rating (1-10)
 * @property {number} stats.kumikata - Grip fighting rating (1-10)
 * @property {number} stats.newaza - Groundwork rating (1-10)
 * @property {string} signatureMoveId - ID of the judoka's signature move
 * @property {string|Date} [lastUpdated] - Can be a string (from JSON) or a Date object
 * @property {string} profileUrl - URL to the judoka's profile (e.g., Wikipedia link)
 * @property {string} gender - Gender of the judoka (e.g., "female")
 * @property {boolean} isHidden - Whether the judoka is hidden (default: false)
 * @property {string} rarity - Rarity of the judoka card (e.g., "Common", "Rare", "Legendary") (default: "Common")
 * @property {string} cardCode - Unique card code for the judoka
 * @example
 * {
 *   id: 1,
 *   firstname: "Teddy",
 *   surname: "Riner",
 *   country: "France",
 *   countryCode: "FR",
 *   weightClass: "+100kg",
 *   stats: {
 *     power: 10,
 *     speed: 8,
 *     technique: 9,
 *     kumikata: 9,
 *     newaza: 8
 *   },
 *   signatureMoveId: "uchi-mata",
 *   lastUpdated: "2023-05-01",
 *   profileUrl: "https://en.wikipedia.org/wiki/Teddy_Riner",
 *   gender: "male",
 *   isHidden: false,
 *   rarity: "Legendary",
 *   cardCode: "TR-Legendary"
 * }
 */

/**
 * @typedef {Object} GokyoEntry
 * @property {string} id - Unique identifier for the technique
 * @property {string} name - Name of the technique (e.g., "Uchi Mata")
 */

/**
 * @typedef {Object} JudokaCard
 * @property {Judoka} judoka - The judoka displayed on the card
 * @property {string} signatureMove - The name of the signature move
 */

/**
 * @typedef {Object} CountryCodeEntry
 * @property {string} country - Full country name (e.g., "Japan")
 * @property {string} code - 2-letter country code (e.g., "JP")
 * @property {string} [lastUpdated] - ISO date string indicating the last update (optional)
 * @property {string} [updatedBy] - User name or ID of the person who last updated the entry (optional)
 * @property {boolean} active - Whether the country code is active (default: true)
 */

// Exporting an empty object to allow importing this file in other modules
export default {};
