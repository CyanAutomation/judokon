import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";

export const STATS = ["power", "speed", "technique", "kumikata", "newaza"];

let playerScore = 0;
let computerScore = 0;
let timerId = null;
let remaining = 0;
let matchEnded = false;
let roundsPlayed = 0;

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
      return "Computer wins the match!";
    }
    return "Match ends in a tie!";
  }
  return "";
}

/**
 * Start the round timer.
 *
 * @pseudocode
 * 1. Initialize the remaining seconds and invoke `onTick`.
 * 2. Create a 1-second interval that updates `remaining` and calls `onTick`.
 * 3. When the timer reaches zero, stop the interval and invoke `onExpired`.
 *
 * @param {function} onTick - Callback executed each second with the remaining time.
 * @param {function} onExpired - Callback executed when the timer expires.
 */
export function startRound(onTick, onExpired) {
  remaining = 30;
  if (onTick) onTick(remaining);
  timerId = setInterval(() => {
    remaining -= 1;
    if (onTick) onTick(remaining);
    if (remaining <= 0) {
      stopTimer();
      if (!matchEnded && onExpired) onExpired();
    }
  }, 1000);
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
    message = "Computer wins the round!";
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

export function _resetForTest() {
  playerScore = 0;
  computerScore = 0;
  matchEnded = false;
  roundsPlayed = 0;
  remaining = 0;
  stopTimer();
}
