/**
 * @typedef {object} TimerSetting
 * @property {number} id Unique identifier for the setting.
 * @property {number} skill Skill level associated with the timer.
 * @property {number} value Duration in seconds.
 * @property {boolean} default Whether this value is the default for its category.
 * @property {boolean} required Whether the timer selection is required.
 * @property {string} category Timer category.
 * @property {string} description Human readable description.
 */

/**
 * Game timers configuration.
 *
 * Timer-driven round logic has been replaced by a turn-based button-click flow.
 * Timers are no longer used. This export remains for schema compatibility only.
 *
 * @type {TimerSetting[]}
 */
const gameTimers = [];

// Kept for backwards-compatibility only – no active timer entries remain.
// Previously contained "roundTimer", "coolDownTimer", and "matchStartTimer" entries.
// See: AGENTS.md – timers replaced by turn-based "Next Round" button flow.

export default gameTimers;
