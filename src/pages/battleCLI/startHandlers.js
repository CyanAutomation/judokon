/**
 * Wire up Start Match affordances for the CLI.
 *
 * @returns {void}
 * @pseudocode
 * startBtn = #start-match -> on click dispatch CustomEvent('startclicked')
 * make Enter/Space activate start when button focused
 */
export function bindStartHandlers(doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return;
  const btn = doc.getElementById("start-match");
  if (!btn) return;
  const dispatchStart = () => {
    try {
      const evt = new CustomEvent("startclicked", { bubbles: true });
      doc.dispatchEvent(evt);
    } catch {}
    try {
      btn.setAttribute("disabled", "true");
    } catch {}
  };
  try {
    btn.addEventListener("click", dispatchStart);
    btn.addEventListener("keydown", (e) => {
      if (!e) return;
      const k = e.key?.toLowerCase();
      if (k === "enter" || k === " ") {
        e.preventDefault();
        dispatchStart();
      }
    });
  } catch {}
}
