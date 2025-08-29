/**
 * Minimal i18n helper with an English default map.
 *
 * @param {string} key
 * @param {Record<string, any>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = EN[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
}

export const EN = {
  // UI prompts
  "ui.selectMove": "Choose an attribute to challenge!",
  "ui.youPicked": "You Picked: {stat}",
  "ui.opponentChoosing": "Opponent is choosing…",

  // Stat descriptions (short hints for screen readers)
  "stat.desc.power": "Power: raw strength used to dominate throws.",
  "stat.desc.speed": "Speed: quickness in entries and combinations.",
  "stat.desc.technique": "Technique: precision and efficiency of form.",
  "stat.desc.kumikata": "Kumi-kata: effectiveness of grip fighting.",
  "stat.desc.newaza": "Ne-waza: groundwork control and submissions.",

  // Modal labels (samples; extend as needed)
  "modal.roundSelect.title": "Select Match Length"
};
