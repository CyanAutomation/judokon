/**
 * Types and typedefs used across the codebase.
 *
 * @pseudocode
 * 1. Provide JSDoc typedefs for core domain objects (Judoka, JudokaCard, GameMode).
 * 2. Keep this file as a single source of truth for common shapes used by helpers.
 */
/**
 * @typedef {Object} Judoka
 * @property {string|number} id - Unique identifier for the judoka (number for internal use, string for external references)
 * @property {string} firstname - First name of the judoka
 * @property {string} surname - Last name of the judoka
 * @property {string} country - Full country name (e.g., "Portugal")
 * @property {string} countryCode - 2-letter lowercase country code (e.g., "pt")
 * @property {string} weightClass - Weight class (e.g., "-52kg")
 * @property {Object} stats - Judoka's stats (all ratings are between 1 and 10)
 * @property {number} stats.power - Power rating (1-10)
 * @property {number} stats.speed - Speed rating (1-10)
 * @property {number} stats.technique - Technique rating (1-10)
 * @property {number} stats.kumikata - Grip fighting rating (1-10)
 * @property {number} stats.newaza - Groundwork rating (1-10)
 * @property {number} signatureMoveId - ID of the judoka's signature move
 * @property {string|Date} [lastUpdated] - Can be a string (from JSON) or a Date object
 * @property {string} profileUrl - URL to the judoka's profile (e.g., Wikipedia link)
 * @property {string} bio - Biography or description of the judoka
 * @property {string} gender - Gender of the judoka (e.g., "female")
 * @property {boolean} isHidden - Whether the judoka is hidden (default: false)
 * @property {string} rarity - Rarity of the judoka card (e.g., "Common", "Rare", "Legendary") (default: "Common")
 * @property {string} cardCode - Unique card code for the judoka
 * @property {number} matchesWon - Number of matches won by the judoka
 * @property {number} matchesLost - Number of matches lost by the judoka
 * @property {number} matchesDrawn - Number of matches drawn by the judoka
 * @example
 * {
 *   id: 1,
 *   firstname: "Teddy",
 *   surname: "Riner",
 *   country: "France",
 *   countryCode: "fr",
 *   weightClass: "+100",
 *   stats: {
 *     power: 10,
 *     speed: 8,
 *     technique: 9,
 *     kumikata: 9,
 *     newaza: 8
 *   },
 *   signatureMoveId: 42,
 *   lastUpdated: "2023-05-01",
 *   profileUrl: "https://en.wikipedia.org/wiki/Teddy_Riner",
 *   bio: "Teddy Riner is a French judoka and one of the most decorated athletes in the sport.",
 *   gender: "male",
 *   isHidden: false,
 *   rarity: "Legendary",
 *   cardCode: "TR-Legendary",
 *   matchesWon: 100,
 *   matchesLost: 5,
 *   matchesDrawn: 2
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
 * @typedef {Object} GameMode
 * @property {number} id - Unique identifier for the game mode
 * @property {string} name - The name of the game mode
 * @property {string} [japaneseName] - The Japanese name of the game mode
 * @property {string} description - A brief description of the game mode
 * @property {boolean} [isHidden] - Indicates whether the game mode is hidden
 * @property {Object} rules - The rules associated with the game mode
 * @property {number} [rules.rounds] - The number of rounds in the game mode
 * @property {number} [rules.teamSize] - The size of the team in the game mode
 * @property {number} [rules.maxScore] - The maximum score achievable
 * @property {"male"|"female"|"mixed"|"any"} [rules.gender] - The gender restriction
 * @property {Array<string>} [rules.options] - Options available for the game mode
 * @property {string} [rules.base] - The base ruleset for the game mode
 * @property {string} [rules.note] - Additional notes about the rules
 * @example
 * {
 *   id: 1,
 *   name: "Classic Battle",
 *   japaneseName: "試合 (バトルモード)",
 *   description: "A standard one-on-one battle mode where players compete to win.",
 *   isHidden: false,
 *   rules: {
 *     rounds: 25,
 *     teamSize: 25,
 *     maxScore: 10,
 *     gender: "any"
 *   }
 * }
 */

/**
 * @typedef {Object} CountryCodeEntry
 * @property {string} country - Full country name (e.g., "Japan")
 * @property {string} code - 2-letter country code (e.g., "JP")
 * @property {string} [lastUpdated] - ISO date string indicating the last update (optional)
 * @property {boolean} active - Whether the country code is active (default: true)
 */

// Exporting an empty object to allow importing this file in other modules
export default {};
