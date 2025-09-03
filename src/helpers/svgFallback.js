/**
 * Applies a fallback image when SVGs fail to load.
 *
 * @pseudocode
 * 1. Query all `<img>` elements with a `.svg` extension in the `src`.
 * 2. Loop through each image:
 *    a. Add an `error` event listener.
 *    b. Replace `src` with `fallbackSrc` when an error occurs.
 *    c. Add the `svg-fallback` CSS class.
 *
 * @param {string} fallbackSrc - Path to the fallback PNG image.
 * @returns {void}
 */

/** Default PNG fallback when an SVG fails to load. */
export const DEFAULT_FALLBACK = "./src/assets/images/judokonLogoSmall.png";

/**
 * Attach error handlers to SVG <img> elements so a raster fallback is used
 * when the SVG fails to load.
 *
 * @pseudocode
 * 1. Select `img` elements where `src` ends with ".svg".
 * 2. For each image, attach a one-time `error` listener.
 * 3. When the listener fires, replace `img.src` with `fallbackSrc` and
 *    add the `svg-fallback` CSS class.
 *
 * @param {string} [fallbackSrc=DEFAULT_FALLBACK] - Path to the PNG fallback image.
 * @returns {void}
 */
export function applySvgFallback(fallbackSrc = DEFAULT_FALLBACK) {
  const svgImages = document.querySelectorAll('img[src$=".svg"]');

  svgImages.forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        // Replace the failed SVG with the provided fallback and mark it.
        img.src = fallbackSrc;
        img.classList.add("svg-fallback");
      },
      { once: true }
    );
  });
}
