/**
 * @typedef {Object} Judoka
 * @property {string} id - Unique identifier for the judoka
 * @property {string} name - First name of the judoka
 * @property {string} surname - Last name of the judoka
 * @property {string} country - Country code (e.g., "JP" for Japan)
 * @property {string} weightClass - Weight class (e.g., "-52kg")
 * @property {Object} stats - Judoka's stats
 * @property {number} stats.power - Power rating (1-10)
 * @property {number} stats.speed - Speed rating (1-10)
 * @property {number} stats.technique - Technique rating (1-10)
 * @property {number} stats.kumiKata - Grip fighting rating (1-10)
 * @property {number} stats.neWaza - Groundwork rating (1-10)
 * @property {string} [signatureMoveId] - Optional ID of the judoka's signature move
 * @property {string|Date} [lastUpdated] - Can be a string (from JSON) or a Date object
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
 * @property {string} code - 3-letter country code (e.g., "JPN")
 * @property {string} lastUpdated - ISO date string
 * @property {string} updatedBy - User name or ID
 * @property {boolean} active - Whether the country code is active
 */

// Exporting an empty object to allow importing this file in other modules
export default {};
