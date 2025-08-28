/**
 * Determine the current screen orientation.
 *
 * @pseudocode
 * 1. Determine the viewport orientation via `innerHeight`/`innerWidth`.
 * 2. Try `matchMedia('(orientation: portrait)')` to check if portrait.
 * 3. When `matchMedia` disagrees with the viewport, prefer the viewport.
 * 4. If `matchMedia` throws, use the viewport value.
 * 5. Return "portrait" when portrait, otherwise "landscape".
 *
 * @returns {"portrait"|"landscape"}
 */
export function getOrientation() {
  const viewportOrientation = window.innerHeight >= window.innerWidth ? "portrait" : "landscape";

  try {
    const mediaOrientation = window.matchMedia("(orientation: portrait)").matches
      ? "portrait"
      : "landscape";

    return mediaOrientation === viewportOrientation ? mediaOrientation : viewportOrientation;
  } catch {
    return viewportOrientation;
  }
}

export default getOrientation;
