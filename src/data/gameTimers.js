/**
 * @typedef {object} TimerSetting
 * @property {number} id Unique identifier for the setting.
 * @property {number} skill Skill level associated with the timer.
 * @property {number} value Duration in seconds.
 * @property {boolean} default Whether this value is the default for its category.
 * @property {boolean} required Whether the timer selection is required.
 * @property {"roundTimer" | "coolDownTimer" | "matchStartTimer"} category Timer category.
 * @property {string} description Human readable description.
 */

/** @type {TimerSetting[]} */
const gameTimers = [
  {
    id: 1,
    skill: 1,
    value: 60,
    default: false,
    required: true,
    category: "roundTimer",
    description: "A LOW round timer that IS required"
  },
  {
    id: 2,
    skill: 2,
    value: 30,
    default: true,
    required: true,
    category: "roundTimer",
    description: "A MEDIUM round timer that IS required"
  },
  {
    id: 3,
    skill: 3,
    value: 10,
    default: false,
    required: true,
    category: "roundTimer",
    description: "A HIGH round timer that IS required"
  },
  {
    id: 4,
    skill: 1,
    value: 5,
    default: false,
    required: true,
    category: "coolDownTimer",
    description: "A LOW cooldown timer that IS required"
  },
  {
    id: 5,
    skill: 2,
    value: 3,
    default: true,
    required: true,
    category: "coolDownTimer",
    description: "A MEDIUM cooldown timer that IS required"
  },
  {
    id: 6,
    skill: 3,
    value: 0,
    default: false,
    required: false,
    category: "coolDownTimer",
    description: "A HIGH cooldown timer that IS NOT required"
  },
  {
    id: 7,
    skill: 1,
    value: 5,
    default: false,
    required: true,
    category: "matchStartTimer",
    description: "A LOW match start timer that IS required"
  },
  {
    id: 8,
    skill: 2,
    value: 3,
    default: true,
    required: true,
    category: "matchStartTimer",
    description: "A MEDIUM match start timer that IS required"
  },
  {
    id: 9,
    skill: 3,
    value: 0,
    default: false,
    required: false,
    category: "matchStartTimer",
    description: "A HIGH match start timer that IS NOT required"
  }
];

export default gameTimers;
