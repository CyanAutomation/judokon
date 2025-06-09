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
 */
export function applySvgFallback(fallbackSrc = "./src/assets/images/judokonLogoSmall.png") {
  const svgImages = document.querySelectorAll('img[src$=".svg"]');

  svgImages.forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.src = fallbackSrc;
        img.classList.add("svg-fallback");
      },
      { once: true }
    );
  });
}
