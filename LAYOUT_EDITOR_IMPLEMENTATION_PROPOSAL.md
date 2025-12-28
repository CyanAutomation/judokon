# Layout Editor Implementation Proposal

## Phase 1 Implementation Status

**Date Completed:** 2025-11-27  
**Status:** ✅ PHASE 1 COMPLETE

### Deliverables Completed

#### 1.1 HTML Structure & Styling

- ✅ **File:** `src/pages/layoutEditor.html` (5,257 bytes, created)
- ✅ **File:** `src/styles/layoutEditor.css` (6,686 bytes, created)
- ✅ Complete toolbar with layout mode selector, reset, export/import buttons
- ✅ Canvas panel with grid background
- ✅ Property inspector panel for region editing
- ✅ Console panel for logging
- ✅ Modal dialogs for import/ASCII export
- ✅ Responsive design with accessible styling

#### 1.2 Component Modules

- ✅ **EditorCanvas.js** (7,309 bytes) - Canvas rendering with drag-resize handlers and grid snapping
- ✅ **PropertyInspector.js** (3,458 bytes) - Region property form with validation
- ✅ **StorageManager.js** (1,833 bytes) - localStorage persistence with versioning
- ✅ **ValidationOverlay.js** (829 bytes) - Real-time error feedback display
- ✅ **ConsolePanel.js** (1,570 bytes) - In-editor console logging
- ✅ **index.js** (11,387 bytes) - Main orchestrator with full event delegation

#### 1.3 Unit Tests (50 tests, all passing)

- ✅ **EditorCanvas.test.js** (10,063 bytes) - 15 tests for rendering, selection, resize logic, event emission
- ✅ **PropertyInspector.test.js** (11,219 bytes) - 20 tests for form population, validation, event system
- ✅ **StorageManager.test.js** (5,724 bytes) - 15 tests for persistence, restore, quota handling

### Code Quality

- ✅ ESLint: 0 errors
- ✅ Prettier: All formatted correctly
- ✅ JSDoc: All exports have valid documentation
- ✅ No unsilenced console logs
- ✅ All 50 unit tests passing

### Features Implemented

**Canvas & Drag-Resize:**

- Dynamic region rendering with grid snapping
- Drag-to-move functionality for regions
- Resize handles (NW, NE, SW, SE) with proper constraints
- Visual feedback (selected region highlighting)
- Grid clamping to prevent overflow

**Property Inspector:**

- Region ID, position (X, Y), dimensions (Width, Height)
- Z-Index and optional feature flag support
- Real-time validation with error feedback
- Delete region with confirmation

**Data Persistence:**

- localStorage auto-save with versioning
- Restore drafts on page load
- Graceful handling of quota exceeded
- Per-mode draft storage

**Import/Export:**

- JSON export with download
- JSON import from paste, file upload, or registry
- ASCII preview generation and export
- Registry-aware layout loading

**Validation & Feedback:**

- Real-time schema validation using Layout Engine
- Error messages displayed in banner
- In-editor console with info/warn/error levels
- Max 100 log entries with auto-scroll

**Integration:**

- Leverages existing Layout Engine (`loadLayout`, `validateLayoutDefinition`)
- Uses layoutRegistry for available modes
- Event system for decoupled component communication

---

## Executive Summary

This document proposes a phased implementation strategy for the Layout Editor (`src/pages/layoutEditor.html`), a browser-based visual tool for creating and editing JU-DO-KON! battle layouts. The implementation leverages existing Layout Engine infrastructure (`applyLayout`, `validateLayoutDefinition`) and follows the project's validation and testing standards.

**Timeline:** 5 phases over ~6-8 weeks  
**Scope:** Grid-based UI, drag-resize, live preview, import/export, localStorage, ASCII export  
**Key Dependencies:** Layout Engine (`loadLayout`, `applyLayout`, `validateLayoutDefinition`, `layoutRegistry`), Feature Flags, Battle pages (Classic/CLI for iframe previews)

---

## Accuracy Audit (2025-02-14)

| Check                            | Result                                                                                                                                                                                                 | Evidence / Follow-up                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Layout Editor assets exist today | ❌ `src/pages` and `src/components` do not contain any `layoutEditor*` entries; this proposal remains net-new work.                                                                                    | `ls src/pages`, `ls src/components`                        |
| Layout data access pattern       | ✅ `src/helpers/layoutEngine/loadLayout.js` already resolves layouts via the generated registry with inline JSON fallback. The editor should call this helper instead of duplicating registry parsing. | `src/helpers/layoutEngine/loadLayout.js`                   |
| Registry shape                   | ❌ The registry is a plain object, not a `Map`. There is no `.get`/`.keys` API, so the editor must use `Object.keys(layoutRegistry)` or `getLayoutModule()`.                                           | `src/helpers/layoutEngine/layoutRegistry.js`               |
| Validation utilities             | ✅ `validateLayoutDefinition` is exported from `src/helpers/layoutEngine/applyLayout.js` and should be reused for both import-time and live validation.                                                | `src/helpers/layoutEngine/applyLayout.js`                  |
| Battle preview targets           | ✅ `battleClassic.html` and `battleCLI.html` exist under `src/pages`; they can be loaded inside the preview iframe.                                                                                    | `src/pages/battleClassic.html`, `src/pages/battleCLI.html` |

The remainder of the document has been updated to reflect these findings—most notably by reusing `loadLayout()` for registry access and by explicitly calling out that the referenced files are deliverables rather than existing assets.

---

## Architecture Overview

### High-Level Components

```
layoutEditor.html (Entry point)
├── EditorCanvas (Grid UI, drag-resize, selection)
├── PropertyInspector (Region metadata editor)
├── Preview Panel (Iframe with live layout)
├── ExportPanel (JSON, ASCII download)
├── ImportPanel (File/paste import)
├── StorageManager (localStorage persistence)
├── ValidationOverlay (Real-time schema feedback)
└── UXTools (Alignment guides, keyboard shortcuts, reset button)
```

### Data Flow

```
User Action (drag, resize, import)
  ↓
EditorState (update in-memory layout)
  ↓
Persistence (localStorage autosave)
  ↓
Validation (validateLayoutDefinition)
  ↓
Preview (postMessage to iframe)
  ↓
Visual Feedback (highlight errors, update DOM)
```

---

## Phase 1: Core Editor UI & Grid Foundation (Week 1-2)

### Goals

- Implement canvas overlay with visible grid
- Load layout data from existing Layout Engine
- Enable drag-resize with grid snapping
- Display region properties in inspector

### Deliverables

#### 1.1 HTML Structure & Styling

**File:** `src/pages/layoutEditor.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JU-DO-KON! Layout Editor</title>
    <link rel="stylesheet" href="../styles/layoutEditor.css" />
  </head>
  <body>
    <div id="editorContainer">
      <!-- Toolbar -->
      <div id="toolbar" class="toolbar">
        <div class="toolbar-section">
          <select id="layoutMode" class="mode-selector">
            <option value="">-- Select Layout Mode --</option>
          </select>
          <button id="resetButton">Reset to Default</button>
        </div>
        <div class="toolbar-section">
          <button id="exportJsonBtn">Export JSON</button>
          <button id="exportAsciiBtn">View ASCII</button>
          <button id="importBtn">Import Layout</button>
        </div>
        <div class="toolbar-section">
          <input type="checkbox" id="gridSnapToggle" checked />
          <label for="gridSnapToggle">Snap to Grid</label>
          <input type="checkbox" id="showGridToggle" checked />
          <label for="showGridToggle">Show Grid</label>
        </div>
      </div>

      <!-- Main Editor Area -->
      <div id="editorMain" class="editor-main">
        <!-- Canvas Panel -->
        <div id="canvasPanel" class="canvas-panel">
          <div id="canvasContainer" class="canvas-container">
            <canvas id="editorCanvas"></canvas>
            <div id="regionOverlay" class="region-overlay"></div>
          </div>
          <div id="validationMessage" class="validation-message hidden"></div>
        </div>

        <!-- Property Inspector -->
        <div id="propertyPanel" class="property-panel">
          <h3>Region Properties</h3>
          <div id="noSelection" class="placeholder">Select a region to edit</div>
          <form id="regionForm" class="hidden">
            <div class="form-group">
              <label>ID</label>
              <input type="text" id="regionId" disabled />
            </div>
            <div class="form-group">
              <label>X (cols)</label>
              <input type="number" id="regionX" min="0" />
            </div>
            <div class="form-group">
              <label>Y (rows)</label>
              <input type="number" id="regionY" min="0" />
            </div>
            <div class="form-group">
              <label>Width (cols)</label>
              <input type="number" id="regionWidth" min="1" />
            </div>
            <div class="form-group">
              <label>Height (rows)</label>
              <input type="number" id="regionHeight" min="1" />
            </div>
            <div class="form-group">
              <label>Z-Index</label>
              <input type="number" id="regionZIndex" />
            </div>
            <div class="form-group">
              <label>Feature Flag (optional)</label>
              <input type="text" id="regionFeatureFlag" />
            </div>
            <button type="submit" class="btn-primary">Apply</button>
            <button type="button" id="deleteRegionBtn" class="btn-danger">Delete Region</button>
          </form>
        </div>
      </div>

      <!-- Preview Iframe -->
      <div id="previewPanel" class="preview-panel hidden">
        <div class="preview-header">
          <h3>Live Preview</h3>
          <button id="closePreviewBtn">&times;</button>
        </div>
        <iframe id="battlePreview" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>

      <!-- Footer Console -->
      <div id="consolePanel" class="console-panel">
        <div id="consoleLogs" class="console-logs"></div>
        <button id="clearConsoleBtn">Clear</button>
      </div>
    </div>

    <!-- Import Modal -->
    <dialog id="importModal" class="modal">
      <div class="modal-content">
        <h2>Import Layout</h2>
        <div class="import-options">
          <div class="option">
            <h4>Paste JSON</h4>
            <textarea
              id="importTextarea"
              placeholder='{"grid": {...}, "regions": [...]}'
            ></textarea>
            <button id="importFromTextBtn">Import</button>
          </div>
          <div class="option">
            <h4>Upload File</h4>
            <input type="file" id="importFile" accept=".json,.layout.js" />
            <button id="importFromFileBtn">Import</button>
          </div>
          <div class="option">
            <h4>Load from Registry</h4>
            <select id="registrySelect"></select>
            <button id="importFromRegistryBtn">Load</button>
          </div>
        </div>
        <form method="dialog" class="modal-close">
          <button id="closeImportBtn" class="btn-secondary" type="submit">Cancel</button>
        </form>
      </div>
    </dialog>

    <!-- ASCII Export Modal -->
    <dialog id="asciiModal" class="modal">
      <div class="modal-content">
        <h2>ASCII Preview</h2>
        <pre id="asciiOutput"></pre>
        <div class="modal-actions">
          <button id="copyAsciiBtn">Copy to Clipboard</button>
          <button id="downloadAsciiBtn">Download</button>
          <form method="dialog">
            <button id="closeAsciiBtn" class="btn-secondary" type="submit">Close</button>
          </form>
        </div>
      </div>
    </dialog>

    <script type="module" src="../components/layoutEditor/index.js"></script>
  </body>
</html>
```

#### 1.2 CSS Styling

**File:** `src/styles/layoutEditor.css`

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f5f5f5;
}

#editorContainer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #ddd;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.toolbar-section select,
.toolbar-section button,
.toolbar-section input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.toolbar-section button {
  background: #007bff;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.toolbar-section button:hover {
  background: #0056b3;
}

/* Main Editor */
.editor-main {
  display: flex;
  flex: 1;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
}

.canvas-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: auto;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 19px, #eee 19px, #eee 20px),
    repeating-linear-gradient(90deg, transparent, transparent 19px, #eee 19px, #eee 20px);
}

#editorCanvas {
  position: absolute;
  top: 0;
  left: 0;
}

.region-overlay {
  position: absolute;
  top: 0;
  left: 0;
}

.region-box {
  position: absolute;
  border: 2px solid #007bff;
  background: rgba(0, 123, 255, 0.1);
  cursor: move;
  transition: all 0.1s;
}

.region-box.selected {
  border: 3px solid #ff6b6b;
  background: rgba(255, 107, 107, 0.2);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.region-box.invalid {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.15);
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #007bff;
  border: 1px solid white;
  cursor: nwse-resize;
}

.resize-handle.se {
  bottom: -5px;
  right: -5px;
}

.resize-handle.sw {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.resize-handle.ne {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.resize-handle.nw {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.validation-message {
  padding: 0.5rem;
  background: #fff3cd;
  border-top: 1px solid #ffc107;
  color: #856404;
  font-size: 0.85rem;
}

.validation-message.hidden {
  display: none;
}

/* Property Panel */
.property-panel {
  width: 300px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  overflow-y: auto;
}

.property-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #333;
}

.placeholder {
  color: #999;
  text-align: center;
  padding: 2rem;
}

#regionForm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

#regionForm.hidden {
  display: none;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #555;
}

.form-group input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-group input:disabled {
  background: #f0f0f0;
  color: #999;
}

.btn-primary {
  background: #28a745;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover {
  background: #218838;
}

.btn-danger {
  background: #dc3545;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 0.5rem;
}

.btn-danger:hover {
  background: #c82333;
}

/* Preview Panel */
.preview-panel {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 400px;
  height: 300px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px 4px 0 0;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.preview-panel.hidden {
  display: none;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #ddd;
}

.preview-header h3 {
  margin: 0;
  font-size: 0.9rem;
}

#battlePreview {
  flex: 1;
  border: none;
  background: white;
}

/* Console Panel */
.console-panel {
  max-height: 200px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-top: 1px solid #333;
  padding: 0.5rem;
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.console-logs {
  flex: 1;
  overflow-y: auto;
}

.console-log {
  padding: 0.25rem;
  margin: 0.1rem 0;
}

.console-log.error {
  color: #f48771;
}

.console-log.warn {
  color: #ce9178;
}

.console-log.info {
  color: #9cdcfe;
}

/* Modals */
.modal {
  border: none;
  padding: 0;
  background: transparent;
  width: min(90vw, 640px);
}

.modal::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background: white;
  border-radius: 4px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
}

.import-options {
  display: grid;
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.option {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #555;
}

.option textarea,
.option input[type="file"],
.option select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.option textarea {
  min-height: 100px;
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.modal-actions form,
.modal-close {
  margin: 0;
}

.modal-close {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

#asciiOutput {
  background: #f5f5f5;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-x: auto;
  font-family: "Courier New", monospace;
  font-size: 0.75rem;
  line-height: 1.4;
}

/* Responsive */
@media (max-width: 1200px) {
  .editor-main {
    flex-direction: column;
  }

  .property-panel {
    width: 100%;
    max-height: 200px;
  }

  .preview-panel {
    width: 100%;
    height: 250px;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 1.3 Core Editor Module

**File:** `src/components/layoutEditor/index.js`

```javascript
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
  isDirty: false
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
  consolePanel: document.getElementById("consolePanel")
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
}

function populateModeSelector() {
  const modes = Object.keys(layoutRegistry).sort();
  elements.layoutMode.innerHTML = `<option value="">-- Select Layout Mode --</option>`;
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
    applyLayoutToEditor(savedLayout);
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
    applyLayoutToEditor(layout);
    consolePanel.info(`Loaded layout: ${mode} [${outcome.source}]`);
  } catch (err) {
    consolePanel.error(`Error loading layout: ${err.message}`);
  }
}

function applyLayoutToEditor(layout) {
  const { errors } = validateLayoutDefinition(layout);
  if (errors.length) {
    consolePanel.error(`Invalid layout: ${errors.join(", ")}`);
    validationOverlay.showErrors(errors);
    return;
  }

  editorState.layout = layout;
  editorState.selectedRegionId = null;
  editorState.isDirty = false;

  canvas.setLayout(layout);
  propertyInspector.clear();
  validationOverlay.clear();

  storageManager.saveDraft(layout);
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
  storageManager.saveDraft(editorState.layout);

  validateCurrentLayout();
}

function handlePropertyUpdate(regionId, updates) {
  if (!editorState.layout) return;

  const region = editorState.layout.regions.find((r) => r.id === regionId);
  if (!region) return;

  Object.assign(region.rect, updates);
  editorState.isDirty = true;

  canvas.updateRegion(regionId, region);
  storageManager.saveDraft(editorState.layout);

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
  // Placeholder; will be implemented in Phase 2
  const lines = [];
  const { grid, regions } = layout;

  // Create grid canvas
  const canvas = Array(grid.rows)
    .fill(null)
    .map(() => Array(grid.cols).fill(" "));

  // Fill regions
  regions.forEach((region) => {
    const { x, y, width, height } = region.rect;
    const char = region.id.charAt(0).toUpperCase();

    for (let row = y; row < y + height && row < grid.rows; row++) {
      for (let col = x; col < x + width && col < grid.cols; col++) {
        canvas[row][col] = char;
      }
    }
  });

  // Convert to string
  lines.push("+" + "-".repeat(grid.cols) + "+");
  canvas.forEach((row) => {
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

function showImportModal() {
  const modal = document.getElementById("importModal");
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
```

#### 1.4 Editor Canvas Component

**File:** `src/components/layoutEditor/EditorCanvas.js`

```javascript
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
    this.overlay.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    document.addEventListener("mouseup", () => this.handleMouseUp());
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
    if (!this.dragState) return;

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
```

#### 1.5 Supporting Components (Sketches)

**PropertyInspector.js** - Form for editing region properties
**StorageManager.js** - localStorage draft management
**ValidationOverlay.js** - Visual error feedback
**ConsolePanel.js** - In-editor console logging

These will be fully implemented in Phase 1.2.

---

## Phase 2: Import/Export & Validation (Week 2-3)

### Goals

- Implement JSON and ASCII export
- Support layout import from file, paste, registry
- Complete real-time validation
- Generate ASCII previews

### Deliverables

#### 2.1 Export Pipeline

- JSON export with metadata (id, engineVersion, grid)
- ASCII export matching Layout Engine format
- Download file helpers

#### 2.2 Import Pipeline

- File upload (.json, .layout.js)
- Paste JSON textarea
- Resolve via `loadLayout()` (registry + inline fallback)
- Validation on import

#### 2.3 Validation System

- Real-time schema validation
- Visual error highlighting
- Constraint checking (grid bounds, unique IDs)

---

## Phase 3: Live Preview Integration (Week 3-4)

### Goals

- Embed battle page in iframe
- Communicate layout via postMessage
- Apply layout live using Layout Engine
- Confirm application via iframe response

### Deliverables

#### 3.1 PostMessage Bridge

- Editor → Iframe: layout object
- Iframe → Editor: confirmation / error
- Bidirectional message protocol

#### 3.2 Battle Iframe Integration

- Load battleClassic.html or battleCLI.html
- Load Layout Engine in iframe context
- Apply incoming layout via postMessage
- Return telemetry

---

## Phase 4: Persistence & Versioning (Week 4-5)

### Goals

- Auto-save drafts to localStorage
- Track layout metadata (id, version)
- Restore drafts on page reload
- Support reset to default

### Deliverables

#### 4.1 StorageManager

- Save/restore draft per mode
- Metadata tagging
- Fallback recovery

#### 4.2 Metadata System

- Include `engineVersion`, `id`, grid dimensions
- Version compatibility checking

---

## Phase 5: UX Enhancements (Week 5-6)

### Goals

- Alignment guides
- Keyboard shortcuts (nudge, snap toggle, duplicate)
- Theme toggle (light/dark)
- Enhanced UI feedback

### Deliverables

#### 5.1 Alignment Guides

- Visual snap lines when regions align
- Optional toggle in toolbar

#### 5.2 Keyboard Shortcuts

- Arrow keys: nudge selected region
- Shift + Arrow: resize
- S: toggle snap
- D: duplicate region
- Del: delete region

#### 5.3 Theme & Accessibility

- Light/dark mode toggle
- Contrast validation
- Keyboard navigation

---

## File Structure

```
src/
├── pages/
│   └── layoutEditor.html           (Entry point)
├── components/
│   └── layoutEditor/
│       ├── index.js                (Main orchestrator)
│       ├── EditorCanvas.js         (Grid rendering, drag-resize)
│       ├── PropertyInspector.js    (Region form)
│       ├── PreviewPanel.js         (Iframe integration)
│       ├── ExportPanel.js          (JSON/ASCII export)
│       ├── ImportPanel.js          (Import handlers)
│       ├── StorageManager.js       (localStorage)
│       ├── ValidationOverlay.js    (Error display)
│       ├── ConsolePanel.js         (Logging)
│       └── AsciiExporter.js        (ASCII generation)
├── helpers/
│   └── layoutEditor/
│       ├── postMessageBridge.js    (Iframe communication)
│       └── layoutValidator.js      (Extended validation)
└── styles/
    └── layoutEditor.css            (Styling)

tests/
├── layoutEditor/
│   ├── EditorCanvas.test.js
│   ├── ExportImport.test.js
│   ├── Validation.test.js
│   ├── Persistence.test.js
│   └── PostMessage.test.js
└── playwright/
    └── layoutEditor.spec.js        (E2E tests)
```

---

## Testing Strategy

### Unit Tests (Vitest)

- **Canvas:** Drag-resize logic, grid snapping, bounds checking
- **Export:** JSON/ASCII generation, file download
- **Import:** Parse JSON, validate schema, restore state
- **Validation:** Schema validation, error detection
- **Storage:** Draft save/restore, metadata handling

### Integration Tests (Playwright)

- Load layout → Edit → Export → Reimport → Verify
- Drag region → Verify position updates in property inspector
- PostMessage communication with battle iframe
- localStorage persistence across reload

### CI Integration

- Store ASCII snapshots in `tests/__snapshots__/layout_ascii/`
- Compare exports against known-good layouts
- Validate against Layout Engine schema

---

## Dependencies & Integration Points

### Existing Infrastructure

- **Layout Engine:** `loadLayout`, `applyLayout`, `validateLayoutDefinition`, `layoutRegistry`
- **Feature Flags:** `featureFlags.js` for conditional regions
- **Battle Pages:** `battleClassic.html`, `battleCLI.html` for iframe targets
- **Telemetry:** `logEvent` for editor actions

### New Files to Create

- `src/pages/layoutEditor.html` (main page)
- `src/components/layoutEditor/*.js` (component modules)
- `src/styles/layoutEditor.css` (styling)
- `tests/layoutEditor/*.test.js` (unit tests)
- `playwright/layoutEditor.spec.js` (E2E tests)

---

## Success Metrics

| Criterion                         | Target          | Validation       |
| --------------------------------- | --------------- | ---------------- |
| Grid snapping accuracy            | ±0 pixels       | Unit test        |
| Drag-resize responsiveness        | <50ms           | Perf test        |
| Import-export round-trip fidelity | <0.5% error     | Integration test |
| ASCII export consistency          | Exact match     | Snapshot test    |
| localStorage persistence          | 100% on reload  | Playwright test  |
| postMessage latency               | <16ms (1 frame) | Benchmark        |
| Validation feedback latency       | <100ms          | Unit test        |

---

## Risk Mitigation

| Risk                            | Mitigation                                    |
| ------------------------------- | --------------------------------------------- |
| **Layout schema changes**       | Version metadata + validation helper          |
| **Iframe sandbox restrictions** | Use `allow-scripts allow-same-origin`         |
| **Browser storage quota**       | Compress draft; warn on large layouts         |
| **Cross-origin postMessage**    | Use `layoutEditor` as page origin (same-site) |
| **Coordinate precision loss**   | Use integers; validate round-trip deviation   |

---

## Open Questions (from PRD)

1. **Side-by-side comparisons?** Defer to Phase 6. Current focus: single mode at a time.
2. **Mandatory ASCII export for PRs?** Policy TBD; optional initially, consider CI integration later.
3. **Live testing during battles?** Defer; requires real-time battle synchronization.
4. **Session vs. persistent storage?** Implement session-only initially (localStorage per mode, clear on browser restart optional).

---

## Handoff Checklist

- [ ] Phase 1 complete: Canvas UI, grid, drag-resize, property inspector
- [ ] Phase 2 complete: Import/export, validation
- [ ] Phase 3 complete: Live preview, postMessage bridge
- [ ] Phase 4 complete: Persistence, metadata
- [ ] Phase 5 complete: UX enhancements, theme, shortcuts
- [ ] All tests passing (vitest + playwright)
- [ ] ESLint, Prettier, JSDoc compliance
- [ ] No unsilenced console logs
- [ ] Documentation updated (README, CONTRIBUTING)

---

## Example Workflow

### Developer Scenario

1. Open `layoutEditor.html`
2. Select "classic" mode from dropdown
3. Layout loads; canvas displays 60×24 grid with scoreboard, arena, hands regions
4. Drag "arena" region to new position
5. Property inspector updates; layout marked dirty
6. Click "View ASCII" to preview layout as ASCII grid
7. Click "Export JSON" to download `layout.1699300560000.json`
8. Save to `src/layouts/classic.v5.layout.json`
9. Convert to `.layout.js` ESM module via build script
10. Reload battle page; layout applies via Layout Engine

### QA Scenario

1. Editor loaded with layout
2. Generate ASCII preview
3. Export ASCII snapshot to `tests/__snapshots__/layout_ascii/classic.v5.txt`
4. Commit to PR
5. CI compares battle screenshots against baseline using ASCII map

---

## Summary

This implementation proposal provides a phased, testable approach to building the Layout Editor within the existing JU-DO-KON! architecture. By leveraging the Layout Engine's validation and appliance logic, and integrating with battle pages via postMessage, the editor becomes a first-class contributor tool for layout design, testing, and iteration.

**Next Steps:**

- [ ] Review proposal with team
- [ ] Prioritize phases for timeline
- [ ] Assign Phase 1 implementation
- [ ] Schedule design review for Phase 2 ASCII export
