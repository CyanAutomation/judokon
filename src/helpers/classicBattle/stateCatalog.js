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

export const version = "v2";

// Keep names aligned with src/helpers/classicBattle/stateTable.js
export const order = [
  "waitingForMatchStart",
  "matchStart",
  "roundWait",
  "roundPrompt",
  "roundSelect",
  "roundResolve",
  "roundDisplay",
  "matchDecision",
  "matchOver",
  "interruptRound",
  "interruptMatch"
];

/**
 * Stable numeric IDs derived from the `order` array.
 *
 * @pseudocode
 * 1. Initialize an empty accumulator object `acc`.
 * 2. Iterate over the `order` array with each `name` and its `idx`.
 * 3. For each `name`, assign a stable ordinal ID by multiplying `(idx + 1)` by 10.
 *    This ensures IDs are multiples of 10 (e.g., 10, 20, 30...) for consistency and extensibility.
 * 4. Return the populated `acc` object, which maps state names to their numeric IDs.
 * @param {Record<string, number>} acc
 * @param {string} name
 * @param {number} idx
 * @returns {Record<string, number>}
 */
export const ids = order.reduce((acc, name, idx) => {
  acc[name] = (idx + 1) * 10;
  return acc;
}, /** @type {Record<string, number>} */ ({}));

export const labels = {
  waitingForMatchStart: "Lobby",
  matchStart: "Start",
  roundWait: "Round Wait",
  roundPrompt: "Round Prompt",
  roundSelect: "Select Stat",
  roundResolve: "Resolve",
  roundDisplay: "Round Display",
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
    "roundWait",
    "roundSelect",
    "roundResolve",
    "roundDisplay",
    "matchOver"
  ]
};

/**
 * Build the state catalog with optional overlay entries.
 *
 * @param {object} [options]
 * @param {boolean} [options.includeRoundModification=false] - Include overlay states.
 * @returns {{version:string, order:string[], ids:Record<string, number>, labels:Record<string, string>, display:object}} Catalog.
 * @pseudocode
 * 1. Choose the base order or insert the overlay state after interruptRound.
 * 2. Generate stable IDs from the selected order.
 * 3. Return the catalog with shared labels and display metadata.
 */
export function buildStateCatalog({ includeRoundModification = false } = {}) {
  const withOverlay = includeRoundModification
    ? [
        ...order.slice(0, order.indexOf("interruptMatch")),
        "roundModification",
        "interruptMatch"
      ]
    : order;
  const overlayIds = withOverlay.reduce((acc, name, idx) => {
    acc[name] = (idx + 1) * 10;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));
  return {
    version,
    order: withOverlay,
    ids: overlayIds,
    labels,
    display
  };
}

export const stateCatalog = { version, order, ids, labels, display };

export default stateCatalog;
