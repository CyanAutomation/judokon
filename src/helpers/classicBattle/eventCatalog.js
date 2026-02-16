/**
 * Canonical Classic Battle domain event catalog.
 *
 * @pseudocode
 * 1. Define canonical event names once and export immutable constants.
 * 2. Map canonical names to deprecated aliases for compatibility fan-out.
 * 3. Publish deprecation metadata so removal timelines stay explicit.
 */

export const EVENT_TYPES = Object.freeze({
  TIMER_ROUND_EXPIRED: "timer.roundExpired",
  TIMER_COUNTDOWN_STARTED: "timer.countdownStarted",
  TIMER_COUNTDOWN_FINISHED: "timer.countdownFinished",
  TIMER_COOLDOWN_EXPIRED: "timer.cooldownExpired",
  UI_STAT_BUTTONS_ENABLED: "ui.statButtonsEnabled",
  UI_STAT_BUTTONS_DISABLED: "ui.statButtonsDisabled",
  UI_COUNTDOWN_STARTED: "ui.countdownStarted",
  UI_CARDS_REVEALED: "ui.cardsRevealed",
  STATE_MATCH_OVER: "state.matchOver",
  STATE_ROUND_STARTED: "state.roundStarted",
  STATE_TRANSITIONED: "state.transitioned",
  STATE_MATCH_CONCLUDED: "state.matchConcluded",
  PLAYER_STAT_SELECTED: "player.statSelected",
  PLAYER_SELECTION_STALLED: "player.selectionStalled",
  SCOREBOARD_MESSAGE_SHOWN: "scoreboard.messageShown",
  SCOREBOARD_MESSAGE_CLEARED: "scoreboard.messageCleared",
  DEBUG_PANEL_UPDATED: "debug.panelUpdated",
  DEBUG_STATE_SNAPSHOT: "debug.stateSnapshot",
  CONTROL_READINESS_REQUIRED: "control.readinessRequired",
  CONTROL_READINESS_CONFIRMED: "control.readinessConfirmed"
});

/**
 * Canonical-to-legacy compatibility alias map.
 *
 * @type {Record<string, string[]>}
 */
export const EVENT_ALIASES = Object.freeze({
  [EVENT_TYPES.TIMER_ROUND_EXPIRED]: ["roundTimeout"],
  [EVENT_TYPES.TIMER_COUNTDOWN_STARTED]: ["control.countdown.started", "nextRoundCountdownStarted"],
  [EVENT_TYPES.TIMER_COUNTDOWN_FINISHED]: ["countdownFinished"],
  [EVENT_TYPES.TIMER_COOLDOWN_EXPIRED]: ["cooldown.timer.expired"],
  [EVENT_TYPES.UI_STAT_BUTTONS_ENABLED]: ["statButtons:enable"],
  [EVENT_TYPES.UI_STAT_BUTTONS_DISABLED]: ["statButtons:disable"],
  [EVENT_TYPES.UI_COUNTDOWN_STARTED]: ["nextRoundCountdownStarted"],
  [EVENT_TYPES.UI_CARDS_REVEALED]: ["cardsRevealed"],
  [EVENT_TYPES.STATE_MATCH_OVER]: ["matchOver"],
  [EVENT_TYPES.STATE_ROUND_STARTED]: ["roundStarted", "round.started"],
  [EVENT_TYPES.STATE_TRANSITIONED]: ["control.state.changed"],
  [EVENT_TYPES.STATE_MATCH_CONCLUDED]: ["match.concluded"],
  [EVENT_TYPES.PLAYER_STAT_SELECTED]: ["statSelected"],
  [EVENT_TYPES.PLAYER_SELECTION_STALLED]: ["statSelectionStalled"],
  [EVENT_TYPES.SCOREBOARD_MESSAGE_SHOWN]: ["scoreboardShowMessage"],
  [EVENT_TYPES.SCOREBOARD_MESSAGE_CLEARED]: ["scoreboardClearMessage"],
  [EVENT_TYPES.DEBUG_PANEL_UPDATED]: ["debugPanelUpdate"],
  [EVENT_TYPES.DEBUG_STATE_SNAPSHOT]: ["debug.state.snapshot"],
  [EVENT_TYPES.CONTROL_READINESS_REQUIRED]: ["control.readiness.required"],
  [EVENT_TYPES.CONTROL_READINESS_CONFIRMED]: ["control.readiness.confirmed"]
});

/**
 * Explicit deprecation schedule for legacy event names.
 *
 * @type {Record<string, {canonical: string, deprecatedSince: string, removalTarget: string}>}
 */
export const LEGACY_EVENT_DEPRECATIONS = Object.freeze({
  roundStarted: {
    canonical: EVENT_TYPES.STATE_ROUND_STARTED,
    deprecatedSince: "2026-02",
    removalTarget: "2026-06"
  },
  "round.started": {
    canonical: EVENT_TYPES.STATE_ROUND_STARTED,
    deprecatedSince: "2026-02",
    removalTarget: "2026-06"
  },
  "control.state.changed": {
    canonical: EVENT_TYPES.STATE_TRANSITIONED,
    deprecatedSince: "2026-02",
    removalTarget: "2026-06"
  }
});
