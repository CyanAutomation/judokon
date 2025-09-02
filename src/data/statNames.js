/**
 * @typedef {object} StatName
 * @property {number} id Unique identifier for the stat.
 * @property {number} statIndex Display order for the stat.
 * @property {string} name English display name.
 * @property {string} category Stat category, e.g. "Judo".
 * @property {string} japanese Japanese translation of the name.
 * @property {string} description Explanation of what the stat represents.
 */

/** @type {StatName[]} */
const statNames = [
  {
    id: 11,
    statIndex: 1,
    name: "Power",
    category: "Judo",
    japanese: "パワー",
    description:
      "Power represents a judoka's raw physical strength - stronger judoka can overpower opponents in throws and grip breaks."
  },
  {
    id: 12,
    statIndex: 2,
    name: "Speed",
    category: "Judo",
    japanese: "スピード",
    description:
      "Speed affects how quickly a judoka can attack or react - useful for counterattacks and surprise techniques."
  },
  {
    id: 13,
    statIndex: 3,
    name: "Technique",
    category: "Judo",
    japanese: "テクニック",
    description:
      "Technique measures mastery of judo throws and transitions - high values indicate sharp, precise execution."
  },
  {
    id: 14,
    statIndex: 4,
    name: "Kumi-kata",
    category: "Judo",
    japanese: "組み方",
    description:
      "Kumi-kata is grip fighting - this stat reflects how well a judoka can control grips and deny their opponent's attacks."
  },
  {
    id: 15,
    statIndex: 5,
    name: "Ne-waza",
    category: "Judo",
    japanese: "寝技",
    description:
      "Ne-waza means ground grappling - this stat reflects skill in pins, holds, and other mat techniques."
  }
];

export default statNames;
