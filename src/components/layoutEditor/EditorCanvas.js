/**
 * Canvas-based region rendering and drag-resize handler.
 *
 * @summary Renders regions as interactive boxes with grid snapping, drag
 * manipulation, and resize handles. Emits selection and change events.
 *
 * @pseudocode
 * 1. Render layout regions as HTML boxes with data attributes.
 * 2. Attach mousedown listeners for drag/resize initiation.
 * 3. On drag/resize, calculate grid-snapped coordinates.
 * 4. Emit region change events with new coordinates.
 * 5. Highlight selected region with visual feedback.
 */

export class EditorCanvas {
  constructor(canvasElement, overlayElement, cellSize, gridCols, gridRows) {
    this.canvas = canvasElement;
    this.overlay = overlayElement;
    this.cellSize = cellSize;
    this.gridCols = gridCols;
    this.gridRows = gridRows;
    this.layout = null;
    this.selectedRegionId = null;
    this.listeners = new Map();
    this.dragState = null;
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
    this.onMouseDown = this.handleMouseDown.bind(this);

    this.resizeCanvas();
    this.setupEventHandlers();
  }

  resizeCanvas() {
    const width = this.gridCols * this.cellSize;
    const height = this.gridRows * this.cellSize;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  setupEventHandlers() {
    this.overlay.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  destroy() {
    this.overlay.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
    this.dragState = null;
  }

  setLayout(layout) {
    this.layout = layout;
    this.render();
  }

  render() {
    this.overlay.innerHTML = "";

    if (!this.layout) return;

    this.layout.regions.forEach((region) => {
      const box = this.createRegionBox(region);
      this.overlay.appendChild(box);
    });
  }

  createRegionBox(region) {
    const { id, rect } = region;
    const { x, y, width, height } = rect;

    const box = document.createElement("div");
    box.className = "region-box";
    box.dataset.regionId = id;

    const left = x * this.cellSize;
    const top = y * this.cellSize;
    const w = width * this.cellSize;
    const h = height * this.cellSize;

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;

    box.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectRegion(id);
    });

    // Add resize handles
    const handles = ["nw", "ne", "sw", "se"];
    handles.forEach((handle) => {
      const resizeHandle = document.createElement("div");
      resizeHandle.className = `resize-handle ${handle}`;
      resizeHandle.dataset.handle = handle;
      box.appendChild(resizeHandle);
    });

    if (id === this.selectedRegionId) {
      box.classList.add("selected");
    }

    return box;
  }

  selectRegion(regionId) {
    if (this.selectedRegionId === regionId) return;

    // Deselect previous
    const prevBox = this.overlay.querySelector(`[data-region-id="${this.selectedRegionId}"]`);
    if (prevBox) {
      prevBox.classList.remove("selected");
    }

    // Select new
    this.selectedRegionId = regionId;
    const box = this.overlay.querySelector(`[data-region-id="${regionId}"]`);
    if (box) {
      box.classList.add("selected");
    }

    this.emit("regionSelected", regionId);
  }

  updateRegion(regionId, region) {
    const box = this.overlay.querySelector(`[data-region-id="${regionId}"]`);
    if (!box) return;

    const { x, y, width, height } = region.rect;
    box.style.left = `${x * this.cellSize}px`;
    box.style.top = `${y * this.cellSize}px`;
    box.style.width = `${width * this.cellSize}px`;
    box.style.height = `${height * this.cellSize}px`;
  }

  handleMouseDown(e) {
    const target = e.target.closest(".region-box");
    if (!target) return;

    const regionId = target.dataset.regionId;
    this.selectRegion(regionId);

    const handle = e.target.closest(".resize-handle")?.dataset.handle;
    if (handle) {
      this.startResize(regionId, handle, e);
    } else {
      this.startDrag(regionId, e);
    }
  }

  startDrag(regionId, e) {
    const region = this.layout.regions.find((r) => r.id === regionId);
    if (!region) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = region.rect.x;
    const origY = region.rect.y;

    this.dragState = {
      regionId,
      startX,
      startY,
      origX,
      origY,
      type: "drag"
    };
  }

  startResize(regionId, handle, e) {
    const region = this.layout.regions.find((r) => r.id === regionId);
    if (!region) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origRect = { ...region.rect };

    this.dragState = {
      regionId,
      startX,
      startY,
      origRect,
      handle,
      type: "resize"
    };
  }

  handleMouseMove(e) {
    if (!this.dragState || !this.layout) return;

    const deltaX = Math.round((e.clientX - this.dragState.startX) / this.cellSize);
    const deltaY = Math.round((e.clientY - this.dragState.startY) / this.cellSize);

    const region = this.layout.regions.find((r) => r.id === this.dragState.regionId);
    if (!region) return;

    if (this.dragState.type === "drag") {
      const x = Math.max(
        0,
        Math.min(this.dragState.origX + deltaX, this.gridCols - region.rect.width)
      );
      const y = Math.max(
        0,
        Math.min(this.dragState.origY + deltaY, this.gridRows - region.rect.height)
      );

      region.rect.x = x;
      region.rect.y = y;
    } else if (this.dragState.type === "resize") {
      this.handleResize(region, this.dragState.handle, deltaX, deltaY, this.dragState.origRect);
    }

    this.updateRegion(region.id, region);
    this.emit("regionChanged", region.id, region.rect);
  }

  handleResize(region, handle, deltaX, deltaY, origRect) {
    const { width, height } = origRect;

    switch (handle) {
      case "se":
        region.rect.width = Math.max(1, width + deltaX);
        region.rect.height = Math.max(1, height + deltaY);
        break;
      case "sw":
        region.rect.x = Math.max(0, origRect.x + deltaX);
        region.rect.width = Math.max(1, width - deltaX);
        region.rect.height = Math.max(1, height + deltaY);
        break;
      case "ne":
        region.rect.y = Math.max(0, origRect.y + deltaY);
        region.rect.width = Math.max(1, width + deltaX);
        region.rect.height = Math.max(1, height - deltaY);
        break;
      case "nw":
        region.rect.x = Math.max(0, origRect.x + deltaX);
        region.rect.y = Math.max(0, origRect.y + deltaY);
        region.rect.width = Math.max(1, width - deltaX);
        region.rect.height = Math.max(1, height - deltaY);
        break;
    }

    // Clamp to grid
    region.rect.x = Math.min(region.rect.x, this.gridCols - region.rect.width);
    region.rect.y = Math.min(region.rect.y, this.gridRows - region.rect.height);
  }

  handleMouseUp() {
    this.dragState = null;
  }

  on(eventName, listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(listener);
  }

  emit(eventName, ...args) {
    const listeners = this.listeners.get(eventName) || [];
    listeners.forEach((listener) => listener(...args));
  }
}
