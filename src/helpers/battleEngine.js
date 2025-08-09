/**
 * JU-DO-KON! Battle Engine
 *
 * @fileoverview Implements core game logic for scoring, round timing, match state, and stat selection timer with pause/resume and auto-selection. UI modules should access this logic through the facade in `helpers/api/battleUI.js` to keep DOM concerns separate.
 * @note This module does NOT handle card rendering, stat concealment, or animation. Stat obscuring and card transitions are managed in the UI layer (see JudokaCard, battleJudokaPage.js, and helpers/api/battleUI.js).
 */

import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { getDefaultTimer, createCountdownTimer } from "./timerUtils.js";

export const STATS = ["power", "speed", "technique", "kumikata", "newaza"];

const DRIFT_THRESHOLD = 2;

let pointsToWin = CLASSIC_BATTLE_POINTS_TO_WIN;
let playerScore = 0;
let computerScore = 0;
let currentTimer = null;
let remaining = 0;
let matchEnded = false;
let roundsPlayed = 0;
let paused = false;
let onTickCb = null;
let onExpiredCb = null;

/**
 * Set the points required to win the match.
 *
 * @pseudocode
 * 1. Assign `value` to `pointsToWin`.
 *
 * @param {number} value - New points threshold to win.
 * @returns {void}
 */
export function setPointsToWin(value) {
  pointsToWin = value;
}

/**
 * Get the points required to win the match.
 *
 * @pseudocode
 * 1. Return `pointsToWin`.
 *
 * @returns {number}
 */
export function getPointsToWin() {
  return pointsToWin;
}

export function stopTimer() {
  if (currentTimer) {
    currentTimer.stop();
    currentTimer = null;
  }
}

function endMatchIfNeeded() {
  if (
    playerScore >= pointsToWin ||
    computerScore >= pointsToWin ||
    roundsPlayed >= CLASSIC_BATTLE_MAX_ROUNDS
  ) {
    matchEnded = true;
    if (playerScore > computerScore) {
      return "You win the match!";
    }
    if (playerScore < computerScore) {
      return "Opponent wins the match!";
    }
    return "Match ends in a tie!";
  }
  return "";
}

/**
 * Start the round/stat selection timer with pause/resume and auto-selection support.
 *
 * @pseudocode
 * 1. Stop any existing timer.
 * 2. Determine the timer duration:
 *    a. If `duration` is undefined, attempt `getDefaultTimer('roundTimer')`, falling back to 30 on error.
 *    b. If the resulting duration is not a number, fall back to 30.
 * 3. Reset `paused` flag and set `remaining` to the duration.
 * 4. Store the `onTick` and `onExpired` callbacks.
 * 5. Create a countdown timer with `createCountdownTimer(duration, { onTick, onExpired, pauseOnHidden: true })`:
 *    - onTick: update `remaining` and invoke stored `onTick`.
 *    - onExpired: if the match hasn't ended, invoke stored `onExpired`.
 * 6. Start the timer.
 *
 * @param {function} onTick - Callback each second with remaining time.
 * @param {function(): Promise<void>} onExpired - Callback when timer expires (auto-select logic).
 * @param {number} [duration] - Timer duration in seconds.
 * @returns {Promise<void>} Resolves when the timer starts.
 */
export async function startRound(onTick, onExpired, duration) {
  if (duration === undefined) {
    try {
      duration = await getDefaultTimer("roundTimer");
    } catch {
      duration = 30;
    }
    if (typeof duration !== "number") duration = 30;
  }
  stopTimer();
  remaining = duration;
  paused = false;
  onTickCb = onTick;
  onExpiredCb = onExpired;
  currentTimer = createCountdownTimer(duration, {
    onTick: (r) => {
      remaining = r;
      if (onTickCb) onTickCb(r);
    },
    onExpired: async () => {
      if (!matchEnded && onExpiredCb) await onExpiredCb();
    },
    pauseOnHidden: true
  });
  currentTimer.start();
}

/**
 * Start the cooldown timer shown between rounds.
 *
 * @pseudocode
 * 1. Stop any existing timer.
 * 2. Determine the cooldown duration:
 *    a. If `duration` is undefined, attempt `getDefaultTimer('coolDownTimer')`, falling back to 3 on error.
 *    b. If the resulting duration is not a number, fall back to 3.
 * 3. Reset `paused` flag and set `remaining` to the duration.
 * 4. Store the `onTick` and `onExpired` callbacks.
 * 5. Create a countdown timer with `createCountdownTimer(duration, { onTick, onExpired, pauseOnHidden: false })`:
 *    - onTick: update `remaining` and invoke stored `onTick`.
 *    - onExpired: if the match hasn't ended, invoke stored `onExpired`.
 * 6. Start the timer.
 *
 * @param {function} onTick - Callback each second with remaining time.
 * @param {function(): (void|Promise<void>)} onExpired - Callback when timer expires.
 * @param {number} [duration] - Cooldown duration in seconds.
 * @returns {Promise<void>} Resolves when the timer starts.
 */
export async function startCoolDown(onTick, onExpired, duration) {
  if (duration === undefined) {
    try {
      duration = await getDefaultTimer("coolDownTimer");
    } catch {
      duration = 3;
    }
    if (typeof duration !== "number") duration = 3;
  }
  stopTimer();
  remaining = duration;
  paused = false;
  onTickCb = onTick;
  onExpiredCb = onExpired;
  currentTimer = createCountdownTimer(duration, {
    onTick: (r) => {
      remaining = r;
      if (onTickCb) onTickCb(r);
    },
    onExpired: async () => {
      if (!matchEnded && onExpiredCb) await onExpiredCb();
    },
    pauseOnHidden: false
  });
  currentTimer.start();
}

/**
 * Pause the round/stat selection timer.
 * @pseudocode
 * 1. Set the `paused` flag to true.
 * 2. If a timer is running, call `pause()` on it.
 */
export function pauseTimer() {
  paused = true;
  if (currentTimer) currentTimer.pause();
}

/**
 * Resume the round/stat selection timer.
 * @pseudocode
 * 1. Clear the `paused` flag.
 * 2. If a timer is running, call `resume()` on it.
 */
export function resumeTimer() {
  paused = false;
  if (currentTimer) currentTimer.resume();
}

/**
 * Compare player and computer stat values to update scores.
 *
 * @pseudocode
 * 1. If the match has already ended, return `matchEnded`, `playerScore`, and `computerScore` with an empty message.
 * 2. Stop any running timer.
 * 3. Compare `playerVal` and `computerVal`:
 *    a. If `playerVal > computerVal`, increment `playerScore` and set win message.
 *    b. If `playerVal < computerVal`, increment `computerScore` and set loss message.
 *    c. Otherwise, set tie message without changing scores.
 * 4. Increment the `roundsPlayed` counter.
 * 5. Call `endMatchIfNeeded()` to update `matchEnded` and get an end-of-match message.
 *    - If it returns a non-empty message, override the round message.
 * 6. Return the message, updated `matchEnded`, and current scores.
 *
 * @param {number} playerVal - Value selected by the player.
 * @param {number} computerVal - Value selected by the computer.
 * @returns {{message: string, matchEnded: boolean, playerScore: number, computerScore: number}}
 */
export function handleStatSelection(playerVal, computerVal) {
  if (matchEnded) {
    return { message: "", matchEnded, playerScore, computerScore };
  }
  stopTimer();
  let message = "";
  if (playerVal > computerVal) {
    playerScore += 1;
    message = "You win the round!";
  } else if (playerVal < computerVal) {
    computerScore += 1;
    message = "Opponent wins the round!";
  } else {
    message = "Tie – no score!";
  }
  roundsPlayed += 1;
  const endMsg = endMatchIfNeeded();
  if (endMsg) {
    message = endMsg;
  }
  return { message, matchEnded, playerScore, computerScore };
}

/**
 * End the current match and return the final message.
 *
 * @pseudocode
 * 1. Set `matchEnded` to true and stop any running timer.
 * 2. Return a quit message along with `playerScore` and `computerScore`.
 *
 * @returns {{message: string, playerScore: number, computerScore: number}}
 */
export function quitMatch() {
  matchEnded = true;
  stopTimer();
  return { message: "You quit the match. You lose!", playerScore, computerScore };
}

export function getScores() {
  return { playerScore, computerScore };
}

export function isMatchEnded() {
  return matchEnded;
}

export function getTimerState() {
  return { remaining, paused };
}

/**
 * Monitor the active timer for drift and invoke a callback when detected.
 *
 * @pseudocode
 * 1. Record the current timestamp as `start`.
 * 2. Every second:
 *    a. If `currentTimer` is absent, stop monitoring.
 *    b. Compute `elapsed = floor((Date.now() - start) / 1000)` and
 *       `expected = duration - elapsed`.
 *    c. Skip drift checks when the timer is paused.
 *    d. If `remaining - expected` > `DRIFT_THRESHOLD`:
 *       i. The timer is behind schedule; clear the monitoring interval.
 *       ii. If `onDrift` is a function, invoke it with current remaining time.
 * 3. Return a function that clears the monitoring interval to stop drift detection.
 *
 * @param {number} duration - Duration originally passed to the timer.
 * @param {function(number): void} onDrift - Callback invoked when drift detected.
 * @returns {function(): void} Function to stop monitoring.
 */
export function watchForDrift(duration, onDrift) {
  const start = Date.now();
  const interval = setInterval(() => {
    if (!currentTimer) {
      clearInterval(interval);
      return;
    }
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const expected = duration - elapsed;
    const { remaining, paused } = getTimerState();
    if (paused) return;
    if (remaining - expected > DRIFT_THRESHOLD) {
      clearInterval(interval);
      if (typeof onDrift === "function") onDrift(remaining);
    }
  }, 1000);
  return () => clearInterval(interval);
}

export function _resetForTest() {
  pointsToWin = CLASSIC_BATTLE_POINTS_TO_WIN;
  playerScore = 0;
  computerScore = 0;
  matchEnded = false;
  roundsPlayed = 0;
  remaining = 0;
  paused = false;
  stopTimer();
}
