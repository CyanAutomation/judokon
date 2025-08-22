/**
 * Watch for orientation changes and update the battle header.
 *
 * @pseudocode
 * 1. Define `getOrientation` using `matchMedia` when available.
 * 2. Define `apply` to set `.battle-header`'s `data-orientation` when it changes.
 * 3. Expose `window.applyBattleOrientation` to manually trigger `apply`.
 * 4. If the header is missing, poll via `scheduleFrame` until `apply` succeeds.
 * 5. On `resize` or `orientationchange`, throttle `apply` with `requestAnimationFrame` and repoll if needed.
 */
import { onFrame as scheduleFrame, cancel as cancelFrame } from "../utils/scheduler.js";

export function watchBattleOrientation() {
  const getOrientation = () => {
    try {
      const portrait = window.innerHeight >= window.innerWidth;
      if (typeof window.matchMedia === "function") {
        const mm = window.matchMedia("(orientation: portrait)");
        if (typeof mm.matches === "boolean" && mm.matches !== portrait) {
          return portrait ? "portrait" : "landscape";
        }
        return mm.matches ? "portrait" : "landscape";
      }
      return portrait ? "portrait" : "landscape";
    } catch {
      return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
    }
  };

  const apply = () => {
    const header = document.querySelector(".battle-header");
    if (header) {
      const next = getOrientation();
      if (header.dataset.orientation !== next) {
        header.dataset.orientation = next;
      }
      return true;
    }
    return false;
  };

  try {
    window.applyBattleOrientation = () => {
      try {
        apply();
      } catch {}
    };
  } catch {}

  let pollId;
  const pollIfMissing = () => {
    if (pollId) return;
    pollId = scheduleFrame(() => {
      if (apply()) {
        cancelFrame(pollId);
        pollId = 0;
      }
    });
  };
  if (!apply()) pollIfMissing();

  let rafId;
  const onChange = () => {
    if (!apply()) pollIfMissing();
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!apply()) pollIfMissing();
    });
  };

  window.addEventListener("orientationchange", onChange);
  window.addEventListener("resize", onChange);
}
