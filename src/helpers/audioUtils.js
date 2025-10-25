import { getSetting } from "./settingsCache.js";

let audioContextPromise;

/**
 * Determine if sound effects are enabled via user settings.
 *
 * @returns {boolean}
 */
export function isSoundEnabled() {
  return getSetting("sound") !== false;
}

function resolveAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.AudioContext || window.webkitAudioContext || null;
}

async function createOrResumeContext() {
  const Ctor = resolveAudioContextConstructor();
  if (!Ctor) {
    return null;
  }
  const ctx = new Ctor();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Browsers may reject resume when user gesture is required.
    }
  }
  return ctx;
}

/**
 * Lazily obtain a shared AudioContext if sound is enabled.
 *
 * @returns {Promise<AudioContext|null>}
 */
export async function getAudioContext() {
  if (!isSoundEnabled()) {
    return null;
  }

  if (!audioContextPromise) {
    audioContextPromise = createOrResumeContext();
  }

  const ctx = await audioContextPromise;
  if (!ctx) {
    return null;
  }

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }

  return ctx;
}

/**
 * Play a short UI tone when sound is enabled.
 *
 * @param {object} [options]
 * @param {number} [options.frequency=880]
 * @param {number} [options.durationMs=140]
 * @param {number} [options.volume=0.04]
 * @returns {Promise<boolean>} Resolves true when a tone was scheduled.
 */
export async function playUiTone(options = {}) {
  if (!isSoundEnabled()) {
    return false;
  }

  const { frequency = 880, durationMs = 140, volume = 0.04 } = options;
  const ctx = await getAudioContext();
  if (!ctx) {
    return false;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.012);
  gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + durationMs / 1000);

  return true;
}
