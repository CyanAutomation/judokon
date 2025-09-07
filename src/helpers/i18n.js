/**
 * Minimal i18n helper that interpolates values into string templates.
 *
 * @summary Return a localized string for `key` with `{placeholders}` replaced.
 * @pseudocode
 * 1. Look up `template = EN[key]` and fall back to `key` when missing.
 * 2. Replace all `{name}` tokens in `template` using entries from `params`.
 * 3. Return the resulting string.
 *
 * @param {string} key - Translation key (e.g., "ui.waiting").
 * @param {Record<string, any>} [params] - Values for `{placeholders}` in the template.
 * @returns {string} Interpolated string.
 */
export function t(key, params = {}) {
  const template = EN[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
}

export const EN = {
  // UI prompts
  "ui.selectMove": "Select your move",
  "ui.youPicked": "You Picked: {stat}",
  "ui.opponentChoosing": "Opponent is choosing…",
  "ui.nextRoundIn": "Next round in: {seconds}s",
  "ui.waiting": "Waiting…",
  "ui.autoSelect": "Time's up! Auto-selecting {stat}",
  "ui.timerErrorAutoSelect": "Timer error. Auto-selecting stat.",
  "ui.statSelectionStalled": "Stat selection stalled. Pick a stat or wait for auto-pick.",

  // Stat descriptions (short hints for screen readers)
  "stat.desc.power": "Power: raw strength used to dominate throws.",
  "stat.desc.speed": "Speed: quickness in entries and combinations.",
  "stat.desc.technique": "Technique: precision and efficiency of form.",
  "stat.desc.kumikata": "Kumi-kata: effectiveness of grip fighting.",
  "stat.desc.newaza": "Ne-waza: groundwork control and submissions.",

  // Modal labels (samples; extend as needed)
  "modal.roundSelect.title": "Select Match Length",
  "modal.roundSelect.error": "Failed to load match options. Using defaults.",
  "modal.quit.title": "Quit the match?",
  "modal.quit.desc": "Your progress will be lost.",
  "modal.quit.cancel": "Cancel",
  "modal.quit.confirm": "Quit"
};
