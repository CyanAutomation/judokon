/**
 * JU-DO-KON! Battle Engine
 *
 * @fileoverview Implements core game logic for scoring, round timing, match state, and stat selection timer with pause/resume and auto-selection.
 * @note This module does NOT handle card rendering, stat concealment, or animation. Stat obscuring and card transitions are managed in the UI layer (see renderJudokaCard and battleJudokaPage.js).
 */

import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { getDefaultTimer } from "./timerUtils.js";

export const STATS = ["power", "speed", "technique", "kumikata", "newaza"];

let playerScore = 0;
let computerScore = 0;
let timerId = null;
let remaining = 0;
let matchEnded = false;
let roundsPlayed = 0;
let paused = false;
let onTickCb = null;
let onExpiredCb = null;

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function endMatchIfNeeded() {
  if (
    playerScore >= CLASSIC_BATTLE_POINTS_TO_WIN ||
    computerScore >= CLASSIC_BATTLE_POINTS_TO_WIN ||
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
 * 1. Determine the timer duration when not provided using `getDefaultTimer('roundTimer')`.
 *    - Fallback to 30 seconds on any error.
 * 2. Set remaining seconds and store callbacks.
 * 3. Call onTick immediately.
 * 4. Start a 1s interval: decrement remaining, call onTick.
 * 5. If timer reaches 0, stop and call onExpired.
 * 6. Listen for page visibility changes: pause timer if hidden, resume if visible.
 *
 * @param {function} onTick - Callback each second with remaining time.
 * @param {function} onExpired - Callback when timer expires (auto-select logic).
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
  if (onTick) onTick(remaining);
  timerId = setInterval(() => {
    if (!paused) {
      remaining -= 1;
      if (onTickCb) onTickCb(remaining);
      if (remaining <= 0) {
        stopTimer();
        if (!matchEnded && onExpiredCb) onExpiredCb();
      }
    }
  }, 1000);
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.removeEventListener("visibilitychange", handleVisibility, false);
    document.addEventListener("visibilitychange", handleVisibility, false);
  }
}

function handleVisibility() {
  if (document.hidden) {
    pauseTimer();
  } else {
    resumeTimer();
  }
}

/**
 * Pause the round/stat selection timer.
 * @pseudocode
 * 1. Set paused flag to true.
 */
export function pauseTimer() {
  paused = true;
}

/**
 * Resume the round/stat selection timer.
 * @pseudocode
 * 1. Set paused flag to false.
 */
export function resumeTimer() {
  paused = false;
}

/**
 * Compare player and computer stat values to update scores.
 *
 * @pseudocode
 * 1. Stop the timer to prevent duplicate selections.
 * 2. Compare the provided values and adjust scores.
 *    - When values are equal, return a tie message.
 * 3. Increment the round counter and check if the match ends.
 * 4. Return the result message along with updated scores.
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
 * 1. Mark the match as ended and stop the timer.
 * 2. Return a message indicating the player quit.
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

export function _resetForTest() {
  playerScore = 0;
  computerScore = 0;
  matchEnded = false;
  roundsPlayed = 0;
  remaining = 0;
  paused = false;
  stopTimer();
}
