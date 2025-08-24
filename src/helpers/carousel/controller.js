import { getPageMetrics } from "./metrics.js";

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
    this._resizeTimer = null;
    this._suppressScrollSync = false;
    this._onKeydown = null;
    this._onTouchStart = null;
    this._onTouchEnd = null;
    this._onPointerDown = null;
    this._onPointerUp = null;

    // Build UI and wire events
    const { left, right } = this._buildButtons();
    this.leftBtn = left;
    this.rightBtn = right;
    this.markersRoot = this._buildMarkers();

    // Structure: [left][container][right][markers]
    this.wrapper.append(this.leftBtn, this.container, this.rightBtn, this.markersRoot);

    this._wireKeyboard();
    this._wireSwipe();
    this._wireScrollSync();
    this._wireResize();

    // Initial sync
    this.update();

    // If constructed while detached, recompute metrics after connection.
    // Ensures correct pageCount/markers once real layout is known.
    this._afterConnectedInit();
  }

  /**
   * Cleans up the carousel controller by removing all event listeners and DOM elements.
   * This prevents memory leaks and ensures proper detachment from the document.
   *
   * @pseudocode
   * 1. Remove the "scroll" event listener from `this.container`.
   * 2. Remove the "keydown" event listener from `this.container`.
   * 3. Remove the "touchstart" event listener from `this.container`.
   * 4. Remove the "touchend" event listener from `this.container`.
   * 5. Remove the "pointerdown" event listener from `this.container`.
   * 6. Remove the "pointerup" event listener from `this.container`.
   * 7. Remove the "resize" event listener from `window`.
   * 8. Remove the `leftBtn` DOM element from the document, if it exists.
   * 9. Remove the `rightBtn` DOM element from the document, if it exists.
   * 10. Remove the `markersRoot` DOM element from the document, if it exists.
   * 11. Set internal event handler references (`_onKeydown`, `_onTouchStart`, etc.) to `null` to release memory.
   *
   * @returns {void}
   */
  destroy() {
    this.container.removeEventListener("scroll", this._onScroll);
    this.container.removeEventListener("keydown", this._onKeydown);
    this.container.removeEventListener("touchstart", this._onTouchStart);
    this.container.removeEventListener("touchend", this._onTouchEnd);
    this.container.removeEventListener("pointerdown", this._onPointerDown);
    this.container.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("resize", this._onResize);
    this.leftBtn?.remove();
    this.rightBtn?.remove();
    this.markersRoot?.remove();
    this._onKeydown =
      this._onTouchStart =
      this._onTouchEnd =
      this._onPointerDown =
      this._onPointerUp =
        null;
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
      requestAnimationFrame(() => this._afterConnectedInit());
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
   * 7. Use `setTimeout(0)` to schedule a task on the next macrotask:
   *    a. In the callback, set `this._suppressScrollSync` back to `false` to re-enable scroll event synchronization. This ensures that any programmatic scroll events dispatched immediately after `scrollTo` are suppressed, but subsequent user scrolls are not.
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
    // Re-enable scroll sync on the next macrotask. Using setTimeout(0)
    // is more reliable across test envs (jsdom/vitest) where rAF may run
    // synchronously; the macrotask ensures programmatic scroll events
    // dispatched immediately after scrollTo are still suppressed.
    setTimeout(() => {
      this._suppressScrollSync = false;
    }, 0);
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
   * Wires up keyboard navigation for the carousel container.
   * Allows users to navigate pages using ArrowLeft and ArrowRight keys.
   *
   * @private
   * @pseudocode
   * 1. Set the `scrollBehavior` style of `this.container` to "auto" for instant scrolling.
   * 2. Set the `tabIndex` of `this.container` to 0 to make it focusable.
   * 3. Define `this._onKeydown` as an event handler function for keydown events:
   *    a. If the event target is not `this.container`, exit the handler.
   *    b. If the pressed key (`event.key`) is "ArrowLeft":
   *       i. Prevent the default browser action for the keydown event.
   *       ii. If `event.stopImmediatePropagation` is a function, call it to prevent other listeners on the same element from being called.
   *       iii. Call `this.prev()` to navigate to the previous page.
   *    c. Else if the pressed key (`event.key`) is "ArrowRight":
   *       i. Prevent the default browser action for the keydown event.
   *       ii. If `event.stopImmediatePropagation` is a function, call it.
   *       iii. Call `this.next()` to navigate to the next page.
   * 4. Add `this._onKeydown` as a "keydown" event listener to `this.container`.
   *
   * @returns {void}
   */
  _wireKeyboard() {
    this.container.style.scrollBehavior = "auto";
    this.container.tabIndex = 0;
    this._onKeydown = (event) => {
      if (event.target !== this.container) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        this.prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        this.next();
      }
    };
    this.container.addEventListener("keydown", this._onKeydown);
  }

  /**
   * Wires up swipe (touch and pointer) navigation for the carousel container.
   * Allows users to navigate pages by swiping left or right.
   *
   * @private
   * @pseudocode
   * 1. Initialize `startX` to 0 to store the starting X-coordinate of a touch/pointer event.
   * 2. Define an `onEnd` helper function that takes `endX` (the ending X-coordinate):
   *    a. Calculate `delta` as the difference between `endX` and `startX`.
   *    b. If `delta` is greater than `this.threshold`, call `this.prev()` to navigate to the previous page.
   *    c. Else if `delta` is less than negative `this.threshold`, call `this.next()` to navigate to the next page.
   * 3. Define `this._onTouchStart` as an event handler for "touchstart" events:
   *    a. Store the `clientX` of the first touch in `startX`.
   * 4. Define `this._onTouchEnd` as an event handler for "touchend" events:
   *    a. Call `onEnd` with the `clientX` of the first changed touch.
   * 5. Add `this._onTouchStart` as a "touchstart" event listener to `this.container`.
   * 6. Add `this._onTouchEnd` as a "touchend" event listener to `this.container`.
   * 7. Initialize `pointerDown` to `false` for tracking pointer (mouse) interactions.
   * 8. Define `this._onPointerDown` as an event handler for "pointerdown" events:
   *    a. Set `pointerDown` to `true`.
   *    b. Store the `clientX` of the pointer event in `startX`.
   * 9. Define `this._onPointerUp` as an event handler for "pointerup" events:
   *    a. If `pointerDown` is `false`, exit the handler.
   *    b. Set `pointerDown` to `false`.
   *    c. Call `onEnd` with the `clientX` of the pointer event.
   * 10. Add `this._onPointerDown` as a "pointerdown" event listener to `this.container`.
   * 11. Add `this._onPointerUp` as a "pointerup" event listener to `this.container`.
   *
   * @returns {void}
   */
  _wireSwipe() {
    let startX = 0;
    const onEnd = (endX) => {
      const delta = endX - startX;
      if (delta > this.threshold) this.prev();
      else if (delta < -this.threshold) this.next();
    };

    this._onTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    this._onTouchEnd = (e) => {
      onEnd(e.changedTouches[0].clientX);
    };
    this.container.addEventListener("touchstart", this._onTouchStart);
    this.container.addEventListener("touchend", this._onTouchEnd);

    // Pointer events for mouse swipe-like interactions
    let pointerDown = false;
    this._onPointerDown = (e) => {
      pointerDown = true;
      startX = e.clientX;
    };
    this._onPointerUp = (e) => {
      if (!pointerDown) return;
      pointerDown = false;
      onEnd(e.clientX);
    };
    this.container.addEventListener("pointerdown", this._onPointerDown);
    this.container.addEventListener("pointerup", this._onPointerUp);
  }

  /**
   * Wires up scroll event synchronization for the carousel container.
   * This method ensures that the `currentPage` and UI are updated when the user scrolls the carousel.
   * It uses both immediate and `requestAnimationFrame`-based synchronization for responsiveness.
   *
   * @private
   * @pseudocode
   * 1. Define `this._onScroll` as an event handler function for "scroll" events:
   *    a. If `this._suppressScrollSync` is true, exit the handler (programmatic scroll is in progress).
   *    b. If `this.metrics.pageWidth` is less than or equal to 0, recalculate `this.metrics` using `getPageMetrics`.
   *    c. Destructure `pageWidth` and `pageCount` from `this.metrics`.
   *    d. If `pageWidth` is greater than 0:
   *       i. Calculate `maxScroll` (maximum scrollable width).
   *       ii. Calculate `remaining` scroll distance.
   *       iii. Determine the `page` based on `scrollLeft` and `pageWidth`, handling the last page edge case.
   *       iv. Update `this.currentPage` by clamping the calculated `page` within valid bounds.
   *       v. Call `this.update()` to refresh the UI immediately.
   *    e. If a previous `_rafId` exists, cancel the associated animation frame.
   *    f. Request a new animation frame (`this._rafId`) to perform a follow-up synchronization:
   *       i. In the animation frame callback, if `this._suppressScrollSync` is true, exit.
   *       ii. If `this.metrics.pageWidth` is less than or equal to 0, recalculate `this.metrics`.
   *       iii. Destructure `pageWidth` (`pw`) and `pageCount` (`pc`) from `this.metrics`.
   *       iv. If `pw` is less than or equal to 0, exit.
   *       v. Recalculate `maxScroll`, `remaining`, and `page` based on current scroll position and metrics.
   *       vi. Update `this.currentPage` by clamping the calculated `page`.
   *       vii. Call `this.update()` to refresh the UI.
   * 2. Add `this._onScroll` as a "scroll" event listener to `this.container`.
   *
   * @returns {void}
   */
  _wireScrollSync() {
    this._onScroll = () => {
      if (this._suppressScrollSync) return;
      if (this.metrics.pageWidth <= 0) {
        this.metrics = getPageMetrics(this.container);
      }
      // Immediate sync for tests and snappy UI
      const { pageWidth, pageCount } = this.metrics;
      if (pageWidth > 0) {
        const maxScroll = this.container.scrollWidth - this.container.clientWidth;
        const remaining = maxScroll - this.container.scrollLeft;
        const page =
          remaining <= 1 ? pageCount - 1 : Math.round(this.container.scrollLeft / pageWidth);
        // (no-op) immediate scroll sync
        this.currentPage = Math.max(0, Math.min(page, pageCount - 1));
        this.update();
      }
      // Follow-up rAF sync to catch any late layout
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = requestAnimationFrame(() => {
        if (this._suppressScrollSync) return;
        if (this.metrics.pageWidth <= 0) {
          this.metrics = getPageMetrics(this.container);
        }
        const { pageWidth: pw, pageCount: pc } = this.metrics;
        if (pw <= 0) return;
        const maxScroll = this.container.scrollWidth - this.container.clientWidth;
        const remaining = maxScroll - this.container.scrollLeft;
        const page = remaining <= 1 ? pc - 1 : Math.round(this.container.scrollLeft / pw);
        // (no-op) rAF scroll sync
        this.currentPage = Math.max(0, Math.min(page, pc - 1));
        this.update();
      });
    };
    this.container.addEventListener("scroll", this._onScroll);
  }

  /**
   * Wires up a debounced resize event listener to the window.
   * This ensures that carousel metrics and markers are re-evaluated and updated
   * only after the user has finished resizing the window, preventing excessive recalculations.
   *
   * @private
   * @pseudocode
   * 1. Define `this._onResize` as an event handler function for "resize" events:
   *    a. Clear any existing `this._resizeTimer` to debounce the resize event.
   *    b. Set `this._resizeTimer` to a new `setTimeout` that will execute after 100 milliseconds:
   *       i. Store the `oldCount` of pages from `this.metrics.pageCount`.
   *       ii. Recalculate `this.metrics` by calling `getPageMetrics` on `this.container`.
   *       iii. If the new `pageCount` is different from `oldCount`:
   *           1. Remove the existing `markersRoot` from the DOM, if it exists.
   *           2. Rebuild `markersRoot` by calling `this._buildMarkers()`.
   *           3. Append the newly built `markersRoot` to `this.wrapper`.
   *       iv. Set the current page by calling `this.setPage` with `this.currentPage`.
   * 2. Add `this._onResize` as a "resize" event listener to the `window` object.
   *
   * @returns {void}
   */
  _wireResize() {
    this._onResize = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        const oldCount = this.metrics.pageCount;
        this.metrics = getPageMetrics(this.container);
        // Rebuild markers if page count changed
        if (this.metrics.pageCount !== oldCount) {
          this.markersRoot?.remove();
          this.markersRoot = this._buildMarkers();
          this.wrapper.append(this.markersRoot);
        }
        this.setPage(this.currentPage);
      }, 100);
    };
    window.addEventListener("resize", this._onResize);
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

  _syncMarkers() {
    const { pageCount } = this.metrics;
    const markers = this.markersRoot.querySelectorAll(".scroll-marker");
    markers.forEach((m, i) => m.classList.toggle("active", i === this.currentPage));
    const counter = this.markersRoot.querySelector(".page-counter");
    if (counter) counter.textContent = `Page ${this.currentPage + 1} of ${pageCount}`;
  }
}
