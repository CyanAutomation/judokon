/**
 * Sets up lazy loading for judoka portrait images using `IntersectionObserver`.
 *
 * @summary This function defers the loading of high-resolution portrait images
 * until they are about to enter the viewport, improving initial page load
 * performance.
 *
 * @pseudocode
 * 1. Check if `IntersectionObserver` is supported in the current environment. If not, exit early.
 * 2. Query all `<img>` elements within the `root` (defaulting to `document`) that have a `data-portrait-src` attribute.
 * 3. If no such images are found, exit early.
 * 4. Define the `onIntersect` callback function for the `IntersectionObserver`:
 *    a. For each `entry` (observed image) that is currently intersecting the viewport:
 *       i. Get the `data-portrait-src` value, which holds the URL of the real image.
 *       ii. Set the `src` attribute of the `<img>` element to this real URL.
 *       iii. Remove the `data-portrait-src` attribute to prevent re-processing.
 *       iv. Stop observing the image using `observer.unobserve(img)`.
 * 5. Create a new `IntersectionObserver` instance, passing `onIntersect` as the callback and configuring a `rootMargin` to preload images slightly before they enter the viewport.
 * 6. Iterate over all found `<img>` elements and instruct the `observer` to `observe` each one.
 *
 * @param {ParentNode} [root=document] - The root element within which to search for lazy-loadable portrait images.
 * @returns {void}
 */
export function setupLazyPortraits(root = document) {
  // Short-circuit in non-browser/test environments where IntersectionObserver
  // is not available (e.g., JSDOM) to avoid runtime errors during tests.
  if (typeof IntersectionObserver === "undefined") return;
  const images = root.querySelectorAll("img[data-portrait-src]");
  if (!images.length) return;

  const onIntersect = (entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const img = entry.target;
        const realSrc = img.getAttribute("data-portrait-src");
        if (realSrc) {
          img.src = realSrc;
          img.removeAttribute("data-portrait-src");
        }
        observer.unobserve(img);
      }
    }
  };

  const observer = new IntersectionObserver(onIntersect, {
    rootMargin: "0px 0px 50px 0px"
  });

  images.forEach((img) => observer.observe(img));
}
