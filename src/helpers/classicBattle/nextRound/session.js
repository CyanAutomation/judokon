/**
 * @typedef {ReturnType<import("../cooldownOrchestrator.js").createCooldownControls>} CooldownControls
 */

/**
 * @typedef {object} NextRoundSession
 * @property {CooldownControls|null} controls - Timer controls exposed to callers.
 * @property {() => CooldownControls|null} getControls - Accessor returning the current controls reference.
 * @property {(
 *   CooldownControls|null
 * ) => CooldownControls|null} setControls - Mutator updating the active controls reference.
 * @property {object|null} runtime - Timer runtime details supplied by the orchestrator.
 * @property {{emit: Function, on: Function, off: Function}|null} bus - Event bus coordinating cooldown events.
 * @property {object|null} scheduler - Scheduler used to run the cooldown timers.
 * @property {boolean} orchestrated - Flag indicating whether the cooldown is orchestrated.
 * @property {unknown} machine - Reference to the classic battle state machine when orchestrated.
 * @property {HTMLElement|null} readinessTarget - Primary DOM node receiving readiness affordances.
 * @property {Record<string, unknown>} metadata - Additional metadata for diagnostics.
 */

/**
 * @typedef {object} NextRoundSessionOptions
 * @property {CooldownControls|null} [controls] - Controls created by the cooldown orchestrator.
 * @property {object|null} [runtime] - Timer runtime utilities returned by the orchestrator.
 * @property {{emit: Function, on: Function, off: Function}|null} [bus] - Event bus instance.
 * @property {object|null} [scheduler] - Scheduler responsible for running timers.
 * @property {boolean} [orchestrated] - Indicates whether orchestration is active.
 * @property {unknown} [machine] - Classic battle machine reference when orchestrated.
 * @property {HTMLElement|null} [readinessTarget] - DOM target for readiness UI updates.
 * @property {Record<string, unknown>} [metadata] - Additional diagnostic context.
 */

/**
 * @summary Create a descriptor for the in-flight next-round cooldown session.
 *
 * @pseudocode
 * 1. Normalise the provided timer controls so a `.controls` property is always available.
 * 2. Attach helper accessors that surface the controls reference without mutating downstream expectations.
 * 3. Capture supporting metadata for diagnostics or future extensions and return the assembled session object.
 *
 * @param {NextRoundSessionOptions} [options={}] - Snapshot of the active cooldown configuration.
 * @returns {NextRoundSession} Session object exposing the timer control structure.
 */
export function createNextRoundSession(options = {}) {
  const {
    controls = null,
    runtime = null,
    bus = null,
    scheduler = null,
    orchestrated = false,
    machine = null,
    readinessTarget = null,
    metadata = {}
  } = options;

  /** @type {NextRoundSession} */
  const session = {
    controls,
    runtime,
    bus,
    scheduler,
    orchestrated: Boolean(orchestrated),
    machine,
    readinessTarget,
    metadata: { ...metadata },
    getControls() {
      return session.controls;
    },
    setControls(nextControls) {
      session.controls = nextControls || null;
      return session.controls;
    }
  };

  return session;
}
