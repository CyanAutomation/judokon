import { fetchJson } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";

/**
 * Minimal event-driven state machine for Classic Battle.
 *
 * Loads states from JSON, tracks current state, and runs onEnter handlers.
 * Transitions are matched by the `on` field value in each state's `triggers`.
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
    let states = [];
    try {
      states = await fetchJson(`${DATA_DIR}classicBattleStates.json`);
    } catch {
      // Fallback to a minimal in-memory scaffold if JSON fails (tests may stub fetch)
      states = [];
    }
    const byName = new Map();
    let initial = null;
    for (const s of states) {
      byName.set(s.name, s);
      if (s.type === "initial" || initial === null) {
        initial = s.name;
      }
    }
    // Fallback initial state to keep orchestration alive even if JSON is missing in tests
    const initName = initial || "waitingForMatchStart";
    const machine = new BattleStateMachine(byName, initName, onEnterMap, context, onTransition);
    if (machine.onTransition) {
      try {
        await machine.onTransition(initName);
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
    this.current = target;
    if (this.onTransition) {
      try {
        await this.onTransition(target);
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
