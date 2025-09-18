import { getPageMetrics } from "./metrics.js";
import { wireKeyboard } from "./keyboard.js";
import { wireSwipe } from "./swipe.js";
import { wireScrollSync } from "./scrollSync.js";
import { wireResize } from "./resize.js";

/**
 * Central controller for carousel navigation and indicators.
 *
 * @pseudocode
 * 1. Build prev/next buttons and scroll markers + counter.
 * 2. Append DOM as [left, container, right, markers] under wrapper.
 * 3. Wire keyboard, swipe/pointer, scroll, and resize to a single update path.
 * 4. Expose setPage/next/prev/update/destroy to manage state deterministically.
 */
export class CarouselController {
  /**
   * @param {HTMLElement} container
   * @param {HTMLElement} wrapper
   * @param {{threshold?:number}} [options]
   */
  constructor(container, wrapper, options = {}) {
    this.container = container;
    this.wrapper = wrapper;
    this.threshold = options.threshold ?? 50;
    this.currentPage = 0;
    this.metrics = getPageMetrics(container);
    this._rafId = null;
    this._attachRafId = null;
    this._resizeTimer = null;
    this._suppressScrollSync = false;
    this._listeners = [];

    // Build UI and wire events
    const { left, right } = this._buildButtons();
    this.leftBtn = left;
    this.rightBtn = right;
    this.markersRoot = this._buildMarkers();

    // Structure: [left][container][right][markers]
    this.wrapper.append(this.leftBtn, this.container, this.rightBtn, this.markersRoot);

    wireKeyboard(this);
    wireSwipe(this);
    wireScrollSync(this);
    wireResize(this);

    // Initial sync
    this.update();

    // If constructed while detached, recompute metrics after connection.
    // Ensures correct pageCount/markers once real layout is known.
    this._afterConnectedInit();
  }

  /**
   * Cleans up the carousel controller by removing event listeners and DOM nodes.
   *
   * @pseudocode
   * 1. Iterate through recorded listeners and remove each.
   * 2. Cancel any pending animation frame and resize timer.
   * 3. Remove navigation buttons and markers from the DOM.
   * 4. Clear the listener registry.
   */
  destroy() {
    for (const { target, event, handler } of this._listeners) {
      target.removeEventListener(event, handler);
    }
    this._listeners = [];
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._attachRafId) cancelAnimationFrame(this._attachRafId);
    clearTimeout(this._resizeTimer);
    this.leftBtn?.remove();
    this.rightBtn?.remove();
    this.markersRoot?.remove();
  }

  /**
   * Initializes the carousel after it has been connected to the DOM.
   * This method is called once the container is part of the document flow,
   * ensuring correct metric calculation and marker rendering.
   * If the container is not yet connected, it polls using `requestAnimationFrame`.
   *
   * @pseudocode
   * 1. Check if `this.container` is connected to the DOM (`this.container.isConnected`).
   * 2. If connected:
   *    a. Store the `oldCount` of pages from `this.metrics.pageCount`.
   *    b. Recalculate `this.metrics` by calling `getPageMetrics` on `this.container`.
   *    c. If the new `pageCount` is different from `oldCount`:
   *       i. Remove the existing `markersRoot` from the DOM, if it exists.
   *       ii. Rebuild `markersRoot` by calling `this._buildMarkers()`.
   *       iii. Append the newly built `markersRoot` to `this.wrapper`.
   *    d. Set the current page by calling `this.setPage` with `this.currentPage`.
   * 3. If not connected:
   *    a. Schedule `_afterConnectedInit` to be called again on the next animation frame using `requestAnimationFrame`.
   *
   * @returns {void}
   */
  _afterConnectedInit() {
    if (this.container.isConnected) {
      const oldCount = this.metrics.pageCount;
      this.metrics = getPageMetrics(this.container);
      if (this.metrics.pageCount !== oldCount) {
        this.markersRoot?.remove();
        this.markersRoot = this._buildMarkers();
        this.wrapper.append(this.markersRoot);
      }
      this.setPage(this.currentPage);
    } else {
      // Poll once per frame until connected to the document
      this._attachRafId = requestAnimationFrame(() => this._afterConnectedInit());
    }
  }

  /**
   * Navigates the carousel to the next page.
   *
   * @pseudocode
   * 1. Increment `this.currentPage` by 1.
   * 2. Call `this.setPage` with the new `this.currentPage` value to update the carousel's display.
   *
   * @returns {void}
   */
  next() {
    this.setPage(this.currentPage + 1);
  }

  /**
   * Navigates the carousel to the previous page.
   *
   * @pseudocode
   * 1. Decrement `this.currentPage` by 1.
   * 2. Call `this.setPage` with the new `this.currentPage` value to update the carousel's display.
   *
   * @returns {void}
   */
  prev() {
    this.setPage(this.currentPage - 1);
  }

  /**
   * Sets the current page of the carousel and updates its display.
   *
   * @pseudocode
   * 1. Destructure `pageCount` and `pageWidth` from `this.metrics`.
   * 2. Clamp the provided `index` to ensure it is within the valid range of pages (0 to `pageCount - 1`).
   * 3. Update `this.currentPage` with the clamped index.
   * 4. Calculate the `left` scroll position by multiplying the clamped index by `pageWidth`.
   * 5. Set `this._suppressScrollSync` to `true` to temporarily disable scroll event synchronization, preventing conflicts with programmatic scrolling.
   * 6. Programmatically scroll the `this.container` to the calculated `left` position with `behavior: "auto"` for instant scrolling.
   * 7. Attach a one-time `scrollend` listener to clear `this._suppressScrollSync` once scrolling finishes and remove the listener.
   * 8. Call `this.update()` to refresh the carousel's UI, including button states and markers.
   *
   * @param {number} index - The 0-based index of the page to set.
   * @returns {void}
   */
  setPage(index) {
    const { pageCount, pageWidth } = this.metrics;
    const clamped = Math.max(0, Math.min(index, pageCount - 1));
    this.currentPage = clamped;
    const left = clamped * pageWidth;
    // Instant scroll prevents animation queues from causing drift.
    // Suppress scroll event sync while performing programmatic scroll to
    // avoid intermediary scroll calculations from overriding the target page.
    this._suppressScrollSync = true;
    this.container.scrollTo({ left, behavior: "auto" });
    // Listen for the scroll to fully end before re-enabling scroll sync.
    const release = () => {
      this._suppressScrollSync = false;
      this.container.removeEventListener("scrollend", release);
    };
    this.container.addEventListener("scrollend", release);
    this.update();
  }

  /**
   * Updates the visual state of the carousel's navigation buttons and page indicators.
   * This method should be called after any change to the carousel's current page or metrics.
   *
   * @pseudocode
   * 1. Destructure `pageCount` from `this.metrics`.
   * 2. Update the disabled state of the `leftBtn`:
   *    a. If `this.leftBtn` exists, set its `disabled` property to `true` if `this.currentPage` is less than or equal to 0 (i.e., on the first page), otherwise `false`.
   * 3. Update the disabled state of the `rightBtn`:
   *    a. If `this.rightBtn` exists, set its `disabled` property to `true` if `this.currentPage` is greater than or equal to `pageCount - 1` (i.e., on the last page), otherwise `false`.
   * 4. Call `this._syncMarkers()` to update the visual appearance of the page markers and the page counter.
   *
   * @returns {void}
   */
  update() {
    // Update button disabled states
    const { pageCount } = this.metrics;
    if (this.leftBtn) this.leftBtn.disabled = this.currentPage <= 0;
    if (this.rightBtn) this.rightBtn.disabled = this.currentPage >= pageCount - 1;

    // Update markers and counter
    this._syncMarkers();
  }

  /**
   * Builds and returns the left (previous) and right (next) navigation buttons for the carousel.
   * Each button includes an SVG icon and a text label, and is wired to navigate the carousel.
   *
   * @private
   * @pseudocode
   * 1. Create a new `button` element for the left navigation.
   * 2. Assign it the class name "scroll-button left".
   * 3. Set its `aria-label` attribute to "Prev.".
   * 4. Set its `innerHTML` to include an SVG icon for "previous" and a `span` with the text "Prev.".
   * 5. Add a "click" event listener to the left button that calls `this.prev()`.
   * 6. Create a new `button` element for the right navigation.
   * 7. Assign it the class name "scroll-button right".
   * 8. Set its `aria-label` attribute to "Next".
   * 9. Set its `innerHTML` to include an SVG icon for "next" and a `span` with the text "Next".
   * 10. Add a "click" event listener to the right button that calls `this.next()`.
   * 11. Return an object containing the created `left` and `right` button elements.
   *
   * @returns {{left: HTMLElement, right: HTMLElement}} An object containing the left and right button elements.
   */
  _buildButtons() {
    const left = document.createElement("button");
    left.className = "scroll-button left";
    left.setAttribute("aria-label", "Prev.");
    left.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="36px" width="36px" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>' +
      '<span class="label">Prev.</span>';
    left.addEventListener("click", () => this.prev());

    const right = document.createElement("button");
    right.className = "scroll-button right";
    right.setAttribute("aria-label", "Next");
    right.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" height="36px" width="36px" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>' +
      '<span class="label">Next</span>';
    right.addEventListener("click", () => this.next());

    return { left, right };
  }

  /**
   * Builds and returns the root element containing the page indicator markers and a page counter.
   * It reuses an existing markers container if found, otherwise creates a new one.
   *
   * @private
   * @pseudocode
   * 1. Attempt to find an existing `.scroll-markers` element within `this.wrapper`.
   * 2. If an existing element is found, reuse it; otherwise, create a new `div` element for the root.
   * 3. Assign the class name "scroll-markers" to the `root` element.
   * 4. Clear any existing `innerHTML` of the `root` element.
   * 5. Destructure `pageCount` from `this.metrics`.
   * 6. Loop from `i = 0` to `pageCount - 1`:
   *    a. Create a new `span` element for each `marker`.
   *    b. Assign the class name "scroll-marker" to the `marker`.
   *    c. Append the `marker` to the `root` element.
   * 7. Create a new `span` element for the `counter`.
   * 8. Assign the class name "page-counter" to the `counter`.
   * 9. Set the `aria-live` attribute of the `counter` to "polite" for accessibility.
   * 10. Append the `counter` to the `root` element.
   * 11. Return the `root` element.
   *
   * @returns {HTMLElement} The root element containing the scroll markers and page counter.
   */
  _buildMarkers() {
    // If existing markers exist (e.g., older init), reuse container
    const existing = this.wrapper.querySelector(".scroll-markers");
    const root = existing || document.createElement("div");
    root.className = "scroll-markers";
    root.innerHTML = "";

    const { pageCount } = this.metrics;
    for (let i = 0; i < pageCount; i++) {
      const marker = document.createElement("span");
      marker.className = "scroll-marker";
      root.appendChild(marker);
    }

    const counter = document.createElement("span");
    counter.className = "page-counter";
    counter.setAttribute("aria-live", "polite");
    root.appendChild(counter);

    return root;
  }

  /**
   * Synchronizes the visual state of the page indicator markers and the page counter
   * to reflect the current page of the carousel.
   *
   * @private
   * @pseudocode
   * 1. Destructure `pageCount` from `this.metrics`.
   * 2. Query all elements with the class "scroll-marker" within `this.markersRoot` to get the `markers` list.
   * 3. Iterate over each `marker` in the `markers` list along with its `index` (`i`):
   *    a. Toggle the "active" class on the `marker` based on whether its `index` (`i`) matches `this.currentPage`.
   * 4. Query the element with the class "page-counter" within `this.markersRoot` to get the `counter`.
   * 5. If `counter` exists, update its `textContent` to display the current page number (1-based) and the total `pageCount`.
   *
   * @returns {void}
   */
  _syncMarkers() {
    const { pageCount } = this.metrics;
    const markers = this.markersRoot.querySelectorAll(".scroll-marker");
    markers.forEach((m, i) => m.classList.toggle("active", i === this.currentPage));
    const counter = this.markersRoot.querySelector(".page-counter");
    if (counter) counter.textContent = `Page ${this.currentPage + 1} of ${pageCount}`;
  }
}
