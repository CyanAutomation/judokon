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

  next() {
    this.setPage(this.currentPage + 1);
  }

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

  update() {
    // Update button disabled states
    const { pageCount } = this.metrics;
    if (this.leftBtn) this.leftBtn.disabled = this.currentPage <= 0;
    if (this.rightBtn) this.rightBtn.disabled = this.currentPage >= pageCount - 1;

    // Update markers and counter
    this._syncMarkers();
  }

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
