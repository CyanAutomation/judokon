/**
 * Classic Battle State Catalog
 *
 * Provides a stable catalog of FSM states with versioned ordinals and
 * display guidance for UI and tooling. This is a declarative data module
 * with no behavior and can be imported by the orchestrator to include
 * `catalogVersion` in control.state.changed events.
 *
 * @pseudocode
 * 1. Define the `order` of state names in strict render order.
 * 2. Build stable numeric `ids` (10,20,...) from `order`.
 * 3. Optionally provide human labels and a `display.include` subset for UI.
 * 4. Export `{ version, order, ids, labels, display }` as the catalog.
 */

export const version = "v1";

// Keep names aligned with src/helpers/classicBattle/stateTable.js
export const order = [
  "waitingForMatchStart",
  "matchStart",
  "cooldown",
  "roundStart",
  "waitingForPlayerAction",
  "roundDecision",
  "roundOver",
  "matchDecision",
  "matchOver",
  "interruptRound",
  "roundModification",
  "interruptMatch"
];

/**
 * Stable numeric ids derived from `order`.
 *
 * @pseudocode
 * 1. Iterate `order` and assign stable ordinal ids (multiples of 10) so
 *    external tooling can rely on numeric versions.
 */
export const ids = order.reduce((acc, name, idx) => {
  acc[name] = (idx + 1) * 10;
  return acc;
}, /** @type {Record<string, number>} */ ({}));

export const labels = {
  waitingForMatchStart: "Lobby",
  matchStart: "Start",
  cooldown: "Cooldown",
  roundStart: "Round Start",
  waitingForPlayerAction: "Select Stat",
  roundDecision: "Resolve",
  roundOver: "Round Over",
  matchDecision: "Match Decision",
  matchOver: "Match Over",
  interruptRound: "Interrupt (Round)",
  roundModification: "Round Modify",
  interruptMatch: "Interrupt (Match)"
};

export const display = {
  // Passive UI typically shows the primary progression states
  include: [
    "waitingForMatchStart",
    "cooldown",
    "waitingForPlayerAction",
    "roundDecision",
    "roundOver",
    "matchOver"
  ]
};

export const stateCatalog = { version, order, ids, labels, display };

export default stateCatalog;
