/**
 * Lazily swap judoka portrait placeholders with the real image.
 *
 * @pseudocode
 * 1. Define an IntersectionObserver callback:
 *      - For each entry that is intersecting,
 *        a. Read `data-portrait-src` from the `<img>` element.
 *        b. Replace the `src` attribute with that value.
 *        c. Remove `data-portrait-src` and unobserve the element.
 * 2. Export `setupLazyPortraits` which:
 *      - Queries all `<img>` elements with `data-portrait-src` within the provided root (default `document`).
 *      - Creates the observer and starts observing each image.
 *
 * @param {ParentNode} [root=document] - Root element containing card images.
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
