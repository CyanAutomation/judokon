/**
 * Available round count options for Classic Battle.
 *
 * @typedef {object} BattleRound
 * @property {number} id
 * @property {string} label
 * @property {number} skill
 * @property {number} value
 * @property {boolean} default
 * @property {string} category
 * @property {string} description
 */

/** @type {BattleRound[]} */
const rounds = [
  {
    id: 1,
    label: "Quick",
    skill: 1,
    value: 5,
    default: false,
    category: "classicBattle",
    description: "A LOW round count total"
  },
  {
    id: 2,
    label: "Medium",
    skill: 2,
    value: 10,
    default: true,
    category: "classicBattle",
    description: "A MEDIUM round count total (default)"
  },
  {
    id: 3,
    label: "Long",
    skill: 3,
    value: 15,
    default: false,
    category: "classicBattle",
    description: "A HIGH round count total"
  }
];

export default rounds;
