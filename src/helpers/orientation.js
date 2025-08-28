/**
 * Determine the current screen orientation.
 *
 * @pseudocode
 * 1. Use `matchMedia('(orientation: portrait)')` to check if portrait.
 * 2. If `matchMedia` throws, compare `innerHeight` and `innerWidth`.
 * 3. Return "portrait" when portrait, otherwise "landscape".
 *
 * @returns {"portrait"|"landscape"}
 */
export function getOrientation() {
  try {
    return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  } catch {
    return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
  }
}

export default getOrientation;
