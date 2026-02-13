import { onDomReady } from "./domReady.js";
import { quitMatch } from "./classicBattle/quitModal.js";
import { markBattlePartReady } from "./battleInit.js";
import { logEvent } from "./telemetry.js";
import {
  STORE_READY_EVENT,
  STORE_POLL_INTERVAL_MS,
  STORE_POLL_MAX_ATTEMPTS
} from "./classicBattleHomeLink.constants.js";

function notifyStoreReadyTimeout(attempts) {
  const payload = {
    attempts,
    intervalMs: STORE_POLL_INTERVAL_MS,
    timeoutMs: attempts * STORE_POLL_INTERVAL_MS
  };
  console.warn("setupClassicBattleHomeLink: battleStore readiness timed out", payload);
  logEvent("classicBattle.homeLink.storeReadyTimeout", payload);
}

function waitForBattleStoreReady() {
  if (window.battleStore) {
    markBattlePartReady("home");
    return;
  }

  let attempts = 0;
  const eventTarget = typeof window !== "undefined" ? window : null;
  let pollId;

  const cleanup = () => {
    if (typeof pollId !== "undefined") {
      clearInterval(pollId);
    }
    eventTarget?.removeEventListener(STORE_READY_EVENT, handleStoreReadyEvent);
  };

  const markHomeReady = () => {
    cleanup();
    markBattlePartReady("home");
  };

  const handleStoreReadyEvent = () => {
    if (!window.battleStore) {
      return;
    }
    markHomeReady();
  };

  eventTarget?.addEventListener(STORE_READY_EVENT, handleStoreReadyEvent);

  pollId = setInterval(() => {
    attempts += 1;
    if (window.battleStore) {
      markHomeReady();
      return;
    }

    if (attempts >= STORE_POLL_MAX_ATTEMPTS) {
      cleanup();
      notifyStoreReadyTimeout(attempts);
    }
  }, STORE_POLL_INTERVAL_MS);
}

/**
 * Attach a quit confirmation handler to the Classic Battle home link.
 *
 * @pseudocode
 * 1. When DOM is ready, query `[data-testid="home-link"]`.
 * 2. If the element exists, attach a click listener that prevents default
 *    navigation and calls `quitMatch(window.battleStore, link)`.
 * 3. Wait for battle store readiness via event and bounded polling fallback.
 * 4. If store readiness times out, emit a controlled warning and telemetry event.
 *
 * @returns {void}
 */
export function setupClassicBattleHomeLink() {
  const homeLinks = Array.from(document.querySelectorAll('[data-testid="home-link"]'));
  if (homeLinks.length === 0) return;

  homeLinks.forEach((link) => {
    if (link.dataset.homeLinkBound === "true") return;
    link.dataset.homeLinkBound = "true";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      quitMatch(window.battleStore, link);
    });
  });

  waitForBattleStoreReady();
}

export { STORE_READY_EVENT, STORE_POLL_INTERVAL_MS, STORE_POLL_MAX_ATTEMPTS };

onDomReady(setupClassicBattleHomeLink);
