import { getSetting } from "./settingsCache.js";

let audioContextPromise;

/**
 * Determine if sound effects are enabled via user settings.
 *
 * @returns {boolean} True when the "sound" setting is not explicitly disabled.
 * @pseudocode
 * SET soundSetting TO getSetting("sound")
 * IF soundSetting is strictly equal to false
 *   RETURN false
 * RETURN true
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
 * @returns {Promise<AudioContext|null>} Resolves to the shared context or null when unavailable.
 * @pseudocode
 * IF sound is not enabled
 *   RETURN null
 * IF audioContextPromise is undefined
 *   SET audioContextPromise TO createOrResumeContext()
 * AWAIT audioContextPromise INTO ctx
 * IF ctx is null
 *   RETURN null
 * IF ctx.state is "suspended"
 *   TRY to resume ctx, RETURN null on failure
 * RETURN ctx
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
 * @param {number} [options.frequency=880] Oscillator frequency in hertz.
 * @param {number} [options.durationMs=140] Tone length in milliseconds.
 * @param {number} [options.volume=0.04] Peak gain value for the tone envelope.
 * @returns {Promise<boolean>} Resolves true when a tone was scheduled.
 * @pseudocode
 * IF sound is not enabled
 *   RETURN false
 * DESTRUCTURE frequency, durationMs, volume from options with defaults
 * AWAIT getAudioContext() INTO ctx
 * IF ctx is null
 *   RETURN false
 * CREATE oscillator and gain nodes from ctx
 * CONFIGURE oscillator type and frequency
 * SHAPE gain envelope over currentTime and duration
 * CONNECT oscillator to gain and gain to destination
 * START oscillator immediately
 * STOP oscillator after durationMs milliseconds
 * RETURN true
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
