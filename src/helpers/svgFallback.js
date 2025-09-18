/** Default PNG fallback when an SVG fails to load. */
export const DEFAULT_FALLBACK = "./src/assets/images/judokonLogoSmall.png";

/** Registry of fallback handlers keyed by image element. */
const fallbackState = new WeakMap();

/** Track images with attached listeners so tests can reset the module state. */
const trackedImages = new Set();

/**
 * Create the internal state record for the provided image element.
 *
 * @param {HTMLImageElement} img
 * @returns {{fallbackSrc: string, fallbackHref: string, appliedFallback: boolean, handleError: (event: ErrorEvent) => void, handleLoad: () => void}}
 */
function createFallbackState(img) {
  const stateRecord = {
    fallbackSrc: "",
    fallbackHref: "",
    appliedFallback: false,
    handleError: () => {
      const state = fallbackState.get(img);
      if (!state || !state.fallbackSrc) {
        return;
      }

      if (img.src !== state.fallbackHref) {
        img.src = state.fallbackSrc;
      }

      img.classList.add("svg-fallback");
      state.appliedFallback = true;
    },
    handleLoad: () => {
      const state = fallbackState.get(img);
      if (!state) {
        img.classList.remove("svg-fallback");
        return;
      }

      const currentHref = img.currentSrc || img.src;

      if (state.appliedFallback && currentHref !== state.fallbackHref) {
        img.classList.remove("svg-fallback");
        state.appliedFallback = false;
      } else if (!state.appliedFallback) {
        img.classList.remove("svg-fallback");
      }
    }
  };

  return stateRecord;
}

/**
 * Attach error handlers to SVG <img> elements so a raster fallback is used
 * when the SVG fails to load.
 *
 * @pseudocode
 * 1. Select `img` elements where `src` ends with ".svg".
 * 2. For each image, register shared `error` and `load` handlers if needed.
 * 3. Persist the fallback reference so repeated calls reuse the handlers.
 * 4. When an error occurs, replace `img.src` with `fallbackSrc` and add the
 *    `svg-fallback` CSS class.
 * 5. When the image later loads with a non-fallback URL, remove the class.
 *
 * @param {string} [fallbackSrc=DEFAULT_FALLBACK] - Path to the PNG fallback image.
 * @returns {void}
 */
export function applySvgFallback(fallbackSrc = DEFAULT_FALLBACK) {
  const resolvedFallbackHref = new URL(fallbackSrc, document.baseURI).href;
  const svgImages = document.querySelectorAll('img[src$=".svg"]');

  svgImages.forEach((img) => {
    let state = fallbackState.get(img);

    if (!state) {
      state = createFallbackState(img);
      fallbackState.set(img, state);
      trackedImages.add(img);
      img.addEventListener("error", state.handleError);
      img.addEventListener("load", state.handleLoad);
    }

    state.fallbackSrc = fallbackSrc;
    state.fallbackHref = resolvedFallbackHref;
  });
}

/**
 * Reset module state. Only intended for use in tests.
 *
 * @returns {void}
 */
export function __resetSvgFallbackStateForTests() {
  trackedImages.forEach((img) => {
    const state = fallbackState.get(img);
    if (state?.handleError) {
      img.removeEventListener("error", state.handleError);
    }

    if (state?.handleLoad) {
      img.removeEventListener("load", state.handleLoad);
    }

    fallbackState.delete(img);
  });

  trackedImages.clear();
}

/**
 * Provide access to an image's fallback state for assertions.
 *
 * @param {HTMLImageElement} img
 * @returns {ReturnType<typeof createFallbackState> | undefined}
 */
export function __getSvgFallbackStateForTests(img) {
  return fallbackState.get(img);
}
