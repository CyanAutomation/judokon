/**
 * Classic Battle state table exported as a static ES module.
 *
 * This replaces runtime JSON fetching to avoid path/MIME/timing issues in
 * production and ensures the state machine is always configured.
 *
 * @description
 * 1. Preload all state metadata and entry actions via static module import.
 * 2. Define deterministic transitions for match, round, and decision phases.
 * 3. Include dedicated interrupt branches for safe abort, resume, or admin flows.
 *
 * State ID Legend:
 *   1-9    = Match/round flow states (main battle progression)
 *   97     = Admin/test states (roundModification)
 *   98-99  = Interrupt handlers (interruptRound, interruptMatch)
 *
 * @typedef {Object} BattleState
 * @property {number} id - Unique numeric state identifier
 * @property {string} name - Machine-readable state name (camelCase)
 * @property {'initial'|'final'} [type] - Optional state classification
 * @property {string} description - Human-readable state purpose
 * @property {string[]} onEnter - Array of action names to execute on entry
 * @property {BattleStateTrigger[]} triggers - State transitions
 *
 * @typedef {Object} BattleStateTrigger
 * @property {string} on - Event name that triggers transition
 * @property {string} target - Target state name
 * @property {string} [guard] - Optional condition (e.g., "autoSelectEnabled", "FF_ROUND_MODIFY")
 * @property {string} [note] - Clarification for complex logic
 *
 * Expected guard conditions:
 * - autoSelectEnabled: boolean, checks FF_AUTO_SELECT feature flag
 * - !autoSelectEnabled: negation of above
 * - FF_ROUND_MODIFY: boolean, admin-only feature flag
 * - playerScore >= winTarget || opponentScore >= winTarget: score comparison
 *
 * @type {BattleState[]}
 */
export const CLASSIC_BATTLE_STATES = [
  {
    id: 1,
    name: "waitingForMatchStart",
    type: "initial",
    description:
      "Idle state before the match begins. UI shows Start/Ready and win target selection (5, 10, or 15).",
    onEnter: ["render:matchLobby", "reset:scoresAndUI"],
    triggers: [
      { on: "startClicked", target: "matchStart" },
      {
        on: "interrupt",
        target: "waitingForMatchStart",
        note: "No active match to abort; remain in lobby."
      }
    ]
  },
  {
    id: 2,
    name: "matchStart",
    description:
      "Initialises match context. Stores selected win target, resets scores, and fixes user as first player for all rounds.",
    onEnter: [
      "init:matchContext",
      "store:winTargetSelection",
      "reset:scores",
      "set:firstPlayerUser"
    ],
    triggers: [
      { on: "ready", target: "cooldown" },
      { on: "interrupt", target: "interruptMatch" },
      { on: "error", target: "interruptMatch" }
    ]
  },
  {
    id: 7,
    name: "cooldown",
    description:
      "Short pacing pause before the first round and between rounds; allows animations and readability.",
    onEnter: ["timer:startShortCountdown", "announce:nextRoundInUI"],
    triggers: [
      { on: "ready", target: "roundStart" },
      { on: "interrupt", target: "interruptRound" }
    ]
  },
  {
    id: 3,
    name: "roundStart",
    description:
      "Begins a new round. Randomly draws judoka for user and opponent, reveals both, user is the active chooser.",
    onEnter: ["draw:randomJudokaBothSides", "reveal:roundCards", "set:activePlayerUser"],
    triggers: [
      { on: "cardsRevealed", target: "waitingForPlayerAction" },
      { on: "interrupt", target: "interruptRound" }
    ]
  },
  {
    id: 4,
    name: "waitingForPlayerAction",
    description:
      "Awaiting the user's stat choice. If no action within the round timer, optional auto-select may fire.",
    onEnter: ["prompt:chooseStat", "timer:startStatSelection", "a11y:exposeTimerStatus"],
    triggers: [
      { on: "statSelected", target: "roundDecision" },
      {
        on: "timeout",
        target: "roundDecision",
        guard: "autoSelectEnabled",
        note: "If FF_AUTO_SELECT is ON, engine auto-picks a stat on timeout."
      },
      {
        on: "timeout",
        target: "interruptRound",
        guard: "!autoSelectEnabled",
        note: "If FF_AUTO_SELECT is OFF, treat timeout as an interrupt path."
      },
      { on: "interrupt", target: "interruptRound" }
    ]
  },
  {
    id: 5,
    name: "roundDecision",
    description: "Compares the selected stat and determines the round outcome.",
    onEnter: ["compare:selectedStat", "compute:roundOutcome", "announce:roundOutcome"],
    triggers: [
      { on: "outcome=winPlayer", target: "roundOver" },
      { on: "outcome=winOpponent", target: "roundOver" },
      { on: "outcome=draw", target: "roundOver" },
      { on: "evaluate", target: "roundDecision" },
      { on: "interrupt", target: "interruptRound" }
    ]
  },
  {
    id: 6,
    name: "roundOver",
    description: "Updates scores and presents a brief summary. No card transfers occur.",
    onEnter: ["update:score", "update:UIRoundSummary"],
    triggers: [
      {
        on: "matchPointReached",
        target: "matchDecision",
        guard: "playerScore >= winTarget || opponentScore >= winTarget",
        note: "Checks the user-selected win target (3/5/10)."
      },
      { on: "continue", target: "cooldown" },
      { on: "interrupt", target: "interruptRound" }
    ]
  },
  {
    id: 8,
    name: "matchDecision",
    description: "Determines the overall winner once a player reaches the selected win target.",
    onEnter: ["compute:matchOutcome", "render:matchSummary"],
    triggers: [
      { on: "finalize", target: "matchOver" },
      { on: "interrupt", target: "interruptMatch" }
    ]
  },
  {
    id: 9,
    name: "matchOver",
    type: "final",
    description: "Match completed. Offer Rematch or Home. Final score remains visible.",
    onEnter: ["show:matchResultScreen"],
    triggers: [
      { on: "rematch", target: "waitingForMatchStart" },
      { on: "home", target: "waitingForMatchStart" }
    ]
  },
  {
    id: 98,
    name: "interruptRound",
    description:
      "Round-level interruption (quit, navigation, or error). Performs safe rollback and offers options.",
    onEnter: [
      "timer:clearIfRunning",
      "rollback:roundContextIfNeeded",
      "log:analyticsInterruptRound"
    ],
    triggers: [
      { on: "roundModifyFlag", target: "roundModification", guard: "FF_ROUND_MODIFY" },
      { on: "restartRound", target: "cooldown" },
      { on: "resumeLobby", target: "waitingForMatchStart" },
      { on: "abortMatch", target: "matchOver" }
    ]
  },
  {
    id: 97,
    name: "roundModification",
    description: "Admin/test-only branch to adjust round decision parameters before re-evaluating.",
    onEnter: ["open:roundModificationPanel"],
    triggers: [
      { on: "modifyRoundDecision", target: "roundDecision" },
      { on: "cancelModification", target: "interruptRound" }
    ]
  },
  {
    id: 99,
    name: "interruptMatch",
    description:
      "Match-level interruption from setup or critical error. Cleans up context and returns to lobby on request.",
    onEnter: ["timer:clearIfRunning", "teardown:matchContext", "log:analyticsInterruptMatch"],
    triggers: [
      { on: "restartMatch", target: "matchStart" },
      { on: "toLobby", target: "waitingForMatchStart" }
    ]
  }
];

/**
 * Action name constants for state onEnter handlers.
 * Use these to avoid typos and enable refactoring across the codebase.
 *
 * @typedef {Object} ClassicBattleActions
 * @property {string} RENDER_MATCH_LOBBY - Display match lobby UI
 * @property {string} RESET_SCORES_AND_UI - Clear scores and reset UI elements
 * @property {string} INIT_MATCH_CONTEXT - Initialize match context and metadata
 * @property {string} STORE_WIN_TARGET - Store user's selected win target (3/5/10)
 * @property {string} RESET_SCORES - Clear player and opponent scores
 * @property {string} SET_FIRST_PLAYER_USER - Fix user as first player for all rounds
 * @property {string} TIMER_START_SHORT_COUNTDOWN - Begin short inter-round pause
 * @property {string} ANNOUNCE_NEXT_ROUND - Display next round notification
 * @property {string} DRAW_RANDOM_JUDOKA - Randomly select judoka for both players
 * @property {string} REVEAL_ROUND_CARDS - Display selected judoka to user
 * @property {string} SET_ACTIVE_PLAYER_USER - Mark user as the active chooser
 * @property {string} PROMPT_CHOOSE_STAT - Display stat selection prompt
 * @property {string} TIMER_START_STAT_SELECTION - Begin stat selection countdown
 * @property {string} A11Y_EXPOSE_TIMER_STATUS - Announce timer status for accessibility
 * @property {string} COMPARE_SELECTED_STAT - Compare user's stat choice
 * @property {string} COMPUTE_ROUND_OUTCOME - Calculate round winner
 * @property {string} ANNOUNCE_ROUND_OUTCOME - Display round result
 * @property {string} UPDATE_SCORE - Increment winner's score
 * @property {string} UPDATE_UI_ROUND_SUMMARY - Display round summary UI
 * @property {string} COMPUTE_MATCH_OUTCOME - Determine overall match winner
 * @property {string} RENDER_MATCH_SUMMARY - Display match summary screen
 * @property {string} SHOW_MATCH_RESULT_SCREEN - Display final result with rematch option
 * @property {string} TIMER_CLEAR_IF_RUNNING - Stop and clear active timers
 * @property {string} ROLLBACK_ROUND_CONTEXT - Restore round state if needed
 * @property {string} LOG_ANALYTICS_INTERRUPT_ROUND - Log round interruption
 * @property {string} OPEN_ROUND_MODIFICATION_PANEL - Open admin round editor
 * @property {string} TEARDOWN_MATCH_CONTEXT - Clean up match data
 * @property {string} LOG_ANALYTICS_INTERRUPT_MATCH - Log match interruption
 */
export const CLASSIC_BATTLE_ACTIONS = {
  RENDER_MATCH_LOBBY: "render:matchLobby",
  RESET_SCORES_AND_UI: "reset:scoresAndUI",
  INIT_MATCH_CONTEXT: "init:matchContext",
  STORE_WIN_TARGET: "store:winTargetSelection",
  RESET_SCORES: "reset:scores",
  SET_FIRST_PLAYER_USER: "set:firstPlayerUser",
  TIMER_START_SHORT_COUNTDOWN: "timer:startShortCountdown",
  ANNOUNCE_NEXT_ROUND: "announce:nextRoundInUI",
  DRAW_RANDOM_JUDOKA: "draw:randomJudokaBothSides",
  REVEAL_ROUND_CARDS: "reveal:roundCards",
  SET_ACTIVE_PLAYER_USER: "set:activePlayerUser",
  PROMPT_CHOOSE_STAT: "prompt:chooseStat",
  TIMER_START_STAT_SELECTION: "timer:startStatSelection",
  A11Y_EXPOSE_TIMER_STATUS: "a11y:exposeTimerStatus",
  COMPARE_SELECTED_STAT: "compare:selectedStat",
  COMPUTE_ROUND_OUTCOME: "compute:roundOutcome",
  ANNOUNCE_ROUND_OUTCOME: "announce:roundOutcome",
  UPDATE_SCORE: "update:score",
  UPDATE_UI_ROUND_SUMMARY: "update:UIRoundSummary",
  COMPUTE_MATCH_OUTCOME: "compute:matchOutcome",
  RENDER_MATCH_SUMMARY: "render:matchSummary",
  SHOW_MATCH_RESULT_SCREEN: "show:matchResultScreen",
  TIMER_CLEAR_IF_RUNNING: "timer:clearIfRunning",
  ROLLBACK_ROUND_CONTEXT: "rollback:roundContextIfNeeded",
  LOG_ANALYTICS_INTERRUPT_ROUND: "log:analyticsInterruptRound",
  OPEN_ROUND_MODIFICATION_PANEL: "open:roundModificationPanel",
  TEARDOWN_MATCH_CONTEXT: "teardown:matchContext",
  LOG_ANALYTICS_INTERRUPT_MATCH: "log:analyticsInterruptMatch"
};
