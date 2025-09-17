import { getDefaultTimer } from "../timerUtils.js";
import { setupFallbackTimer } from "./roundManager.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { guard, guardAsync } from "./guard.js";
import { setSkipHandler } from "./skipHandler.js";

/**
 * Additional buffer to ensure fallback timers fire after engine-backed timers.
 *
 * @type {number}
 */
const FALLBACK_TIMER_BUFFER_MS = 200;

/**
 * Initialize the match start cooldown timer.
 *
 * @param {object} machine State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Resolve `matchStartTimer` with 3s default.
 * 2. Emit countdown start events.
 * 3. On `countdownFinished` → dispatch `ready`.
 * 4. In tests → finish immediately.
 * 5. Otherwise schedule fallback timer to dispatch `ready`.
 */
export async function initStartCooldown(machine) {
  let duration = 3;
  try {
    const val = await getDefaultTimer("matchStartTimer");
    if (typeof val === "number") duration = val;
  } catch {}
  duration = Math.max(1, Number(duration));
  let fallback;
  const finish = () => {
    guard(() => offBattleEvent("countdownFinished", finish));
    guard(() => clearTimeout(fallback));
    guard(() => emitBattleEvent("control.countdown.completed"));
    guardAsync(() => machine.dispatch("ready"));
  };
  onBattleEvent("countdownFinished", finish);
  guard(() => emitBattleEvent("countdownStart", { duration }));
  guard(() => emitBattleEvent("control.countdown.started", { durationMs: duration * 1000 }));
  if (isTestModeEnabled && isTestModeEnabled()) {
    if (typeof queueMicrotask === "function") queueMicrotask(finish);
    else setTimeout(finish, 0);
    return;
  }
  const schedule = typeof setupFallbackTimer === "function" ? setupFallbackTimer : setTimeout;
  fallback = schedule(duration * 1000 + FALLBACK_TIMER_BUFFER_MS, finish);
}

/**
 * Initialize the inter-round cooldown timer.
 *
 * @param {object} machine State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Compute cooldown duration and emit countdown start events.
 * 2. Enable the Next button and mark it ready.
 * 3. Start engine-backed timer; on expire → mark ready, emit events, dispatch `ready`.
 * 4. Schedule fallback timer with same completion path.
 */
export async function initInterRoundCooldown(machine) {
  const { computeNextRoundCooldown } = await import("../timers/computeNextRoundCooldown.js");
  const { createRoundTimer } = await import("../timers/createRoundTimer.js");
  const { startCoolDown } = await import("../battleEngineFacade.js");
  const duration = computeNextRoundCooldown();

  let expired = false;
  let fallbackId;

  const timer = createRoundTimer({ starter: startCoolDown });

  const finish = () => {
    console.log("finish called. expired:", expired);
    if (expired) return;
    expired = true;
    console.log("finish running. dispatching ready");

    clearTimeout(fallbackId);
    timer.stop();
    setSkipHandler(null);

    guard(() => {
      const b =
        document.getElementById("next-button") ||
        document.querySelector('[data-role="next-round"]');
      if (b) {
        b.disabled = false;
        b.dataset.nextReady = "true";
        b.setAttribute("data-next-ready", "true");
        b.removeAttribute("disabled");
      }
    });
    for (const evt of [
      "cooldown.timer.expired",
      "nextRoundTimerReady",
      "countdownFinished",
      "control.countdown.completed"
    ]) {
      guard(() => emitBattleEvent(evt));
    }
    guardAsync(() => machine.dispatch("ready"));
  };

  const markReady = (btn) => {
    btn.disabled = false;
    btn.dataset.nextReady = "true";
    btn.setAttribute("data-next-ready", "true");
    btn.removeAttribute("disabled");
  };

  guard(() => emitBattleEvent("countdownStart", { duration }));
  guard(() =>
    emitBattleEvent("control.countdown.started", {
      durationMs: duration * 1000
    })
  );

  const btn =
    document.getElementById("next-button") || document.querySelector('[data-role="next-round"]');
  if (btn) {
    markReady(btn);
    setTimeout(() => {
      const b = document.getElementById("next-button");
      if (b && b.dataset.nextReady !== "true" && machine?.getState?.() === "cooldown") markReady(b);
    }, 0);
  }

  guard(() => emitBattleEvent("nextRoundTimerReady"));

  timer.on("expired", finish);
  timer.on("tick", (r) =>
    guard(() =>
      emitBattleEvent("cooldown.timer.tick", {
        remainingMs: Math.max(0, Number(r) || 0) * 1000
      })
    )
  );

  setSkipHandler(finish);

  timer.start(duration);
  fallbackId = setupFallbackTimer(duration * 1000 + FALLBACK_TIMER_BUFFER_MS, finish);
}
