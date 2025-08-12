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
  }

  destroy() {
    this.container.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onResize);
    this.leftBtn?.remove();
    this.rightBtn?.remove();
    this.markersRoot?.remove();
  }

  next() {
    this.setPage(this.currentPage + 1);
  }

  prev() {
    this.setPage(this.currentPage - 1);
  }

  setPage(index) {
    const { pageCount, pageWidth } = this.metrics;
    const clamped = Math.max(0, Math.min(index, pageCount - 1));
    this.currentPage = clamped;
    const left = clamped * pageWidth;
    // Instant scroll prevents animation queues from causing drift.
    this.container.scrollTo({ left, behavior: "auto" });
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
    this.container.addEventListener("keydown", (event) => {
      if (event.target !== this.container) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        this.next();
      }
    });
  }

  _wireSwipe() {
    let startX = 0;
    const onEnd = (endX) => {
      const delta = endX - startX;
      if (delta > this.threshold) this.prev();
      else if (delta < -this.threshold) this.next();
    };

    this.container.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    });
    this.container.addEventListener("touchend", (e) => {
      onEnd(e.changedTouches[0].clientX);
    });

    // Pointer events for mouse swipe-like interactions
    let pointerDown = false;
    this.container.addEventListener("pointerdown", (e) => {
      pointerDown = true;
      startX = e.clientX;
    });
    this.container.addEventListener("pointerup", (e) => {
      if (!pointerDown) return;
      pointerDown = false;
      onEnd(e.clientX);
    });
  }

  _wireScrollSync() {
    this._onScroll = () => {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = requestAnimationFrame(() => {
        const { pageWidth, pageCount } = this.metrics;
        if (pageWidth <= 0) return;
        const page = Math.round(this.container.scrollLeft / pageWidth);
        this.currentPage = Math.max(0, Math.min(page, pageCount - 1));
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

