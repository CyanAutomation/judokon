/**
 * PropertyInspector - Region metadata editor form.
 *
 * @summary Displays and edits properties of a selected region (position, size, z-index, feature flag).
 * Emits regionUpdated events when properties are applied.
 *
 * @pseudocode
 * 1. Hide form initially; show placeholder.
 * 2. When setRegion called, populate form fields with region data.
 * 3. On form submit, validate inputs and emit regionUpdated event.
 * 4. On delete button click, emit regionDeleted event.
 */

export class PropertyInspector {
  constructor(containerElement) {
    this.container = containerElement;
    this.form = containerElement.querySelector("#regionForm");
    this.noSelection = containerElement.querySelector("#noSelection");
    this.currentRegionId = null;
    this.listeners = new Map();

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    document.getElementById("deleteRegionBtn").addEventListener("click", (e) => {
      e.preventDefault();
      this.handleDelete();
    });
  }

  setRegion(region) {
    if (!region) {
      this.clear();
      return;
    }

    this.currentRegionId = region.id;
    this.noSelection.classList.add("hidden");
    this.form.classList.remove("hidden");

    // Populate form fields
    document.getElementById("regionId").value = region.id;
    document.getElementById("regionX").value = region.rect.x;
    document.getElementById("regionY").value = region.rect.y;
    document.getElementById("regionWidth").value = region.rect.width;
    document.getElementById("regionHeight").value = region.rect.height;
    document.getElementById("regionZIndex").value = region.rect.z || 0;
    document.getElementById("regionFeatureFlag").value = region.featureFlag || "";
  }

  updateValues(rect) {
    document.getElementById("regionX").value = rect.x;
    document.getElementById("regionY").value = rect.y;
    document.getElementById("regionWidth").value = rect.width;
    document.getElementById("regionHeight").value = rect.height;
  }

  clear() {
    this.currentRegionId = null;
    this.form.classList.add("hidden");
    this.noSelection.classList.remove("hidden");
    this.form.reset();
  }

  handleSubmit(e) {
    e.preventDefault();

    if (!this.currentRegionId) return;

    const updates = {
      x: parseInt(document.getElementById("regionX").value, 10),
      y: parseInt(document.getElementById("regionY").value, 10),
      width: parseInt(document.getElementById("regionWidth").value, 10),
      height: parseInt(document.getElementById("regionHeight").value, 10),
      z: parseInt(document.getElementById("regionZIndex").value, 10) || 0
    };

    // Validate inputs
    if (updates.x < 0 || updates.y < 0 || updates.width < 1 || updates.height < 1) {
      this.emit("validationError", "Position and size must be non-negative; size must be at least 1");
      return;
    }

    this.emit("regionUpdated", this.currentRegionId, updates);
  }

  handleDelete() {
    if (!this.currentRegionId || !confirm("Delete this region?")) return;
    this.emit("regionDeleted", this.currentRegionId);
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
