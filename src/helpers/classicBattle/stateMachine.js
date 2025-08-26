import { CLASSIC_BATTLE_STATES } from "./stateTable.js";

/**
 * Minimal event-driven state machine for Classic Battle.
 *
 * Loads states from JSON, tracks current state, and runs onEnter handlers.
 * Transitions are matched by the `on` field value in each state's `triggers`.
 *
 * @pseudocode
 * ```text
 * async create(onEnterMap, context, onTransition):
 *   states = CLASSIC_BATTLE_STATES (embedded module)
 *   for each state in states:
 *     byName[state.name] = state
 *     if state.type is 'initial' or initial unset -> initial = state.name
 *   initName = initial or 'waitingForMatchStart'
 *   machine = new BattleStateMachine(byName, initName, onEnterMap, context, onTransition)
 *   if onTransition -> await onTransition({from:null, to:initName, event:'init'})
 *   await machine.#runOnEnter(initName)
 *
 * dispatch(event, payload):
 *   state = statesByName[current]
 *   trigger = state.triggers.find(t.on == event)
 *   if trigger and statesByName has trigger.target:
 *     from = current; current = trigger.target
 *     if onTransition -> await onTransition({from, to:current, event})
 *     await #runOnEnter(current, payload)
 *
 * #runOnEnter(name, payload):
 *   fn = onEnterMap[name]
 *   if fn -> await fn(machine, payload) catching errors
 * ```
 */
export class BattleStateMachine {
  constructor(statesByName, initialName, onEnterMap, context = {}, onTransition) {
    this.statesByName = statesByName;
    this.current = initialName;
    this.onEnterMap = onEnterMap || {};
    this.context = context;
    this.onTransition = typeof onTransition === "function" ? onTransition : null;
  }

  static async create(onEnterMap, context = {}, onTransition) {
    // Load states from the embedded table for reliability in all environments.
    // Allow a narrow test-only override via globalThis.__CLASSIC_BATTLE_STATES__
    // so unit tests can inject minimal tables without network mocks.
    const override =
      typeof globalThis !== "undefined" && Array.isArray(globalThis.__CLASSIC_BATTLE_STATES__)
        ? globalThis.__CLASSIC_BATTLE_STATES__
        : null;
    const states = override || (Array.isArray(CLASSIC_BATTLE_STATES) ? CLASSIC_BATTLE_STATES : []);
    const byName = new Map();
    let initial = null;
    for (const s of states) {
      byName.set(s.name, s);
      if (s.type === "initial" || initial === null) {
        initial = s.name;
      }
    }
    // Fallback initial state to keep orchestration alive even if table is empty in tests
    const initName = initial || "waitingForMatchStart";
    const machine = new BattleStateMachine(byName, initName, onEnterMap, context, onTransition);
    if (machine.onTransition) {
      try {
        await machine.onTransition({ from: null, to: initName, event: "init" });
      } catch {}
    }
    await machine.#runOnEnter(initName);
    return machine;
  }

  getState() {
    return this.current;
  }

  async dispatch(eventName, payload) {
    const state = this.statesByName.get(this.current);
    if (!state || !Array.isArray(state.triggers)) return;
    const match = state.triggers.find((t) => t.on === eventName);
    if (!match) return;
    const target = match.target;
    if (!this.statesByName.has(target)) return;
    const from = this.current;
    this.current = target;
    if (this.onTransition) {
      try {
        await this.onTransition({ from, to: target, event: eventName });
      } catch {}
    }
    await this.#runOnEnter(target, payload);
  }

  async #runOnEnter(stateName, payload) {
    const fn = this.onEnterMap[stateName];
    if (typeof fn === "function") {
      try {
        await fn(this, payload);
      } catch (err) {
        // Swallow onEnter errors to avoid breaking game flow
        console.debug("State onEnter error", stateName, err);
      }
    }
  }
}
