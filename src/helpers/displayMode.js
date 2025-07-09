/**
 * Apply the chosen display mode by toggling body classes.
 *
 * @pseudocode
 * 1. Remove both `dark-mode` and `gray-mode` classes from `document.body`.
 * 2. If `mode` is "dark", add the `dark-mode` class.
 * 3. Else if `mode` is "gray", add the `gray-mode` class.
 *
 * @param {"light"|"dark"|"gray"} mode - Desired display mode.
 */
export function applyDisplayMode(mode) {
  document.body.classList.remove("dark-mode", "gray-mode");
  if (mode === "dark") {
    document.body.classList.add("dark-mode");
  } else if (mode === "gray") {
    document.body.classList.add("gray-mode");
  }
}
