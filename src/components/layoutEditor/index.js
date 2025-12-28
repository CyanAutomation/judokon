/**
 * Layout Editor entry point.
 *
 * @summary Orchestrates the layout editor UI, including canvas rendering,
 * region management, property inspector, and persistence.
 *
 * @pseudocode
 * 1. Initialize DOM elements and event listeners.
 * 2. Load layout registry and populate mode selector.
 * 3. Set up canvas rendering and grid snapping.
 * 4. Attach drag-resize handlers to regions.
 * 5. Connect property inspector updates to region state.
 * 6. Set up localStorage persistence.
 * 7. Initialize validation and visual feedback systems.
 */

import { layoutRegistry } from "../../helpers/layoutEngine/layoutRegistry.js";
import { loadLayout as resolveLayout } from "../../helpers/layoutEngine/loadLayout.js";
import { validateLayoutDefinition } from "../../helpers/layoutEngine/applyLayout.js";
import { EditorCanvas } from "./EditorCanvas.js";
import { PropertyInspector } from "./PropertyInspector.js";
import { StorageManager } from "./StorageManager.js";
import { ValidationOverlay } from "./ValidationOverlay.js";
import { ConsolePanel } from "./ConsolePanel.js";

const GRID_COLS = 60;
const GRID_ROWS = 24;
const GRID_CELL_SIZE = 20; // pixels per grid unit

let editorState = {
  layout: null,
  selectedRegionId: null,
  isDirty: false,
  currentMode: null
};

const elements = {
  container: document.getElementById("editorContainer"),
  layoutMode: document.getElementById("layoutMode"),
  resetButton: document.getElementById("resetButton"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  exportAsciiBtn: document.getElementById("exportAsciiBtn"),
  importBtn: document.getElementById("importBtn"),
  canvasPanel: document.getElementById("canvasPanel"),
  regionOverlay: document.getElementById("regionOverlay"),
  propertyPanel: document.getElementById("propertyPanel"),
  validationMessage: document.getElementById("validationMessage"),
  consolePanel: document.getElementById("consolePanel"),
  gridSnapToggle: document.getElementById("gridSnapToggle"),
  showGridToggle: document.getElementById("showGridToggle")
};

let canvas, propertyInspector, storageManager, validationOverlay, consolePanel;

async function initializeEditor() {
  // Initialize subsystems
  canvas = new EditorCanvas(
    document.getElementById("editorCanvas"),
    elements.regionOverlay,
    GRID_CELL_SIZE,
    GRID_COLS,
    GRID_ROWS
  );

  propertyInspector = new PropertyInspector(elements.propertyPanel);
  storageManager = new StorageManager();
  validationOverlay = new ValidationOverlay(elements.validationMessage);
  consolePanel = new ConsolePanel(elements.consolePanel);

  // Populate layout mode selector
  populateModeSelector();

  // Attach event listeners
  attachEventListeners();

  // Load default layout if available
  loadDefaultLayout();

  consolePanel.info("Layout Editor initialized.");
}

function populateModeSelector() {
  const modes = Object.keys(layoutRegistry).sort();

  if (modes.length === 0) {
    consolePanel.warn("No layouts available in registry.");
  }

  elements.layoutMode.innerHTML = '<option value="">-- Select Layout Mode --</option>';
  modes.forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode;
    elements.layoutMode.appendChild(option);
  });
}

async function loadDefaultLayout() {
  const savedLayout = storageManager.restoreDraft();
  if (savedLayout) {
    applyLayoutToEditor(savedLayout, "default");
    consolePanel.info("Restored draft layout from storage.");
  }
}

function attachEventListeners() {
  elements.layoutMode.addEventListener("change", handleModeChange);
  elements.resetButton.addEventListener("click", handleReset);
  elements.exportJsonBtn.addEventListener("click", handleExportJson);
  elements.exportAsciiBtn.addEventListener("click", handleExportAscii);
  elements.importBtn.addEventListener("click", handleImport);

  canvas.on("regionSelected", handleRegionSelected);
  canvas.on("regionChanged", handleRegionChanged);

  propertyInspector.on("regionUpdated", handlePropertyUpdate);
  propertyInspector.on("validationError", (msg) => {
    consolePanel.error(msg);
  });
}

async function handleModeChange(e) {
  const mode = e.target.value;
  if (!mode) return;

  try {
    const outcome = resolveLayout(mode, { document });
    if (!outcome.layout) {
      const reason = outcome.errors?.length ? outcome.errors.join("; ") : "unknown error";
      consolePanel.error(`Failed to load layout for mode: ${mode} (${reason})`);
      return;
    }

    const layout = JSON.parse(JSON.stringify(outcome.layout)); // Deep clone
    applyLayoutToEditor(layout, mode);
    consolePanel.info(`Loaded layout: ${mode} [${outcome.source}]`);
  } catch (err) {
    consolePanel.error(`Error loading layout: ${err.message}`);
  }
}

function applyLayoutToEditor(layout, mode = "default") {
  const { errors } = validateLayoutDefinition(layout);
  if (errors.length) {
    consolePanel.error(`Invalid layout: ${errors.join(", ")}`);
    validationOverlay.showErrors(errors);
    return;
  }

  editorState.layout = layout;
  editorState.selectedRegionId = null;
  editorState.isDirty = false;
  editorState.currentMode = mode;

  canvas.setLayout(layout);
  propertyInspector.clear();
  validationOverlay.clear();

  storageManager.saveDraft(layout, mode);
}

function handleRegionSelected(regionId) {
  editorState.selectedRegionId = regionId;
  const region = editorState.layout.regions.find((r) => r.id === regionId);
  propertyInspector.setRegion(region);
}

function handleRegionChanged(regionId, changes) {
  if (!editorState.layout) return;

  const region = editorState.layout.regions.find((r) => r.id === regionId);
  if (!region) return;

  Object.assign(region.rect, changes);
  editorState.isDirty = true;

  propertyInspector.updateValues(region.rect);
  storageManager.saveDraft(editorState.layout, editorState.currentMode);

  validateCurrentLayout();
}

function handlePropertyUpdate(regionId, updates) {
  if (!editorState.layout) return;

  const region = editorState.layout.regions.find((r) => r.id === regionId);
  if (!region) return;

  Object.assign(region.rect, updates);
  editorState.isDirty = true;

  canvas.updateRegion(regionId, region);
  storageManager.saveDraft(editorState.layout, editorState.currentMode);

  validateCurrentLayout();
}

function handleReset() {
  if (!confirm("Reset to default layout? This will discard all changes.")) return;

  const mode = elements.layoutMode.value;
  if (!mode) {
    consolePanel.warn("Select a layout mode first.");
    return;
  }

  handleModeChange({ target: { value: mode } });
}

function handleExportJson() {
  if (!editorState.layout) {
    consolePanel.error("No layout loaded.");
    return;
  }

  const json = JSON.stringify(editorState.layout, null, 2);
  downloadFile(json, `layout.${Date.now()}.json`, "application/json");
  consolePanel.info("Layout exported as JSON.");
}

function handleExportAscii() {
  if (!editorState.layout) {
    consolePanel.error("No layout loaded.");
    return;
  }

  const ascii = generateAsciiPreview(editorState.layout);
  showAsciiModal(ascii);
}

function handleImport() {
  showImportModal();
}

function generateAsciiPreview(layout) {
  const lines = [];
  const { grid, regions } = layout;

  // Create grid canvas
  const gridCanvas = Array(grid.rows)
    .fill(null)
    .map(() => Array(grid.cols).fill(" "));

  // Fill regions
  regions.forEach((region) => {
    const { x, y, width, height } = region.rect;
    const char = region.id.charAt(0).toUpperCase();

    for (let row = y; row < y + height && row < grid.rows; row++) {
      for (let col = x; col < x + width && col < grid.cols; col++) {
        gridCanvas[row][col] = char;
      }
    }
  });

  // Convert to string
  lines.push("+" + "-".repeat(grid.cols) + "+");
  gridCanvas.forEach((row) => {
    lines.push("|" + row.join("") + "|");
  });
  lines.push("+" + "-".repeat(grid.cols) + "+");

  return lines.join("\n");
}

function validateCurrentLayout() {
  if (!editorState.layout) return;

  const { errors } = validateLayoutDefinition(editorState.layout);
  if (errors.length) {
    validationOverlay.showErrors(errors);
  } else {
    validationOverlay.clear();
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showAsciiModal(ascii) {
  const modal = document.getElementById("asciiModal");
  const output = document.getElementById("asciiOutput");
  output.textContent = ascii;

  document.getElementById("copyAsciiBtn").onclick = () => {
    navigator.clipboard.writeText(ascii);
    consolePanel.info("ASCII copied to clipboard.");
  };

  document.getElementById("downloadAsciiBtn").onclick = () => {
    downloadFile(ascii, `layout.${Date.now()}.ascii.txt`, "text/plain");
  };
  if (!modal.open) {
    modal.showModal();
  }
}

function populateImportRegistryOptions() {
  const registrySelect = document.getElementById("registrySelect");
  registrySelect.innerHTML = '<option value="">-- Select from Registry --</option>';

  const modes = Object.keys(layoutRegistry).sort();
  modes.forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode;
  const modes = layoutRegistry ? Object.keys(layoutRegistry).sort() : [];
    registrySelect.appendChild(option);
  });
}

function setupImportModalHandlers(modal) {
  if (modal.dataset.handlersBound) return;
  modal.dataset.handlersBound = "true";

  const registrySelect = document.getElementById("registrySelect");

  document.getElementById("importFromTextBtn").onclick = async () => {
    const json = document.getElementById("importTextarea").value;
    if (!json.trim()) {
      consolePanel.error("Paste JSON first.");
      return;
    }

    try {
      const layout = JSON.parse(json);
      applyLayoutToEditor(layout, "imported");
      modal.close();
      consolePanel.info("Layout imported from JSON.");
    } catch (err) {
      consolePanel.error(`Invalid JSON: ${err.message}`);
    }
  };

  document.getElementById("importFromFileBtn").onclick = async () => {
    const file = document.getElementById("importFile").files[0];
    if (!file) {
      consolePanel.error("Select a file first.");
      return;
    }

    try {
      const text = await file.text();
      const layout = JSON.parse(text);
      applyLayoutToEditor(layout, file.name);
      modal.close();
      consolePanel.info(`Layout imported from file: ${file.name}`);
    } catch (err) {
      consolePanel.error(`Failed to import file: ${err.message}`);
    }
  };

  document.getElementById("importFromRegistryBtn").onclick = () => {
    const mode = registrySelect.value;
    if (!mode) {
      consolePanel.error("Select a layout mode.");
      return;
    }

    handleModeChange({ target: { value: mode } });
    modal.close();
  };
}

function showImportModal() {
  const modal = document.getElementById("importModal");
  populateImportRegistryOptions();
  setupImportModalHandlers(modal);

  if (!modal.open) {
    modal.showModal();
  }
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeEditor);
} else {
  initializeEditor();
}
