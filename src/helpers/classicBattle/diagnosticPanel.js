/**
 * Development-mode diagnostic panel for Classic Battle.
 *
 * Exposes round diagnostics, state machine state, and store information
 * via a toggleable overlay panel. Activated with Ctrl+Shift+D in development mode.
 *
 * @module diagnosticPanel
 */

import { isDevelopmentEnvironment } from "../environment.js";

let panelElement = null;
let isVisible = false;
let updateInterval = null;

/**
 * Format diagnostic data as readable HTML.
 *
 * @param {object} diagnostics - Diagnostic data from getDebugInfo
 * @returns {string} HTML string for display
 * @pseudocode
 * 1. Format store state (selection, rounds, player choice)
 * 2. Format machine state (current state, dispatch availability)
 * 3. Format DOM state (battle state, button states)
 * 4. Format snapshot if available
 * 5. Return structured HTML with sections
 */
function formatDiagnostics(diagnostics) {
  if (!diagnostics) {
    return '<div class="diagnostic-error">No diagnostics available</div>';
  }

  if (diagnostics.error) {
    return `<div class="diagnostic-error">Error: ${diagnostics.error}</div>`;
  }

  const sections = [];

  // Store section
  if (diagnostics.store) {
    sections.push(`
      <div class="diagnostic-section">
        <h3>Store State</h3>
        <ul>
          <li><strong>Selection Made:</strong> ${diagnostics.store.selectionMade ?? "null"}</li>
          <li><strong>Player Choice:</strong> ${diagnostics.store.playerChoice ?? "null"}</li>
          <li><strong>Rounds Played:</strong> ${diagnostics.store.roundsPlayed ?? "null"}</li>
        </ul>
      </div>
    `);
  }

  // Machine section
  if (diagnostics.machine) {
    sections.push(`
      <div class="diagnostic-section">
        <h3>State Machine</h3>
        <ul>
          <li><strong>Current State:</strong> ${diagnostics.machine.currentState ?? "null"}</li>
          <li><strong>Can Dispatch:</strong> ${diagnostics.machine.hasDispatch ? "Yes" : "No"}</li>
        </ul>
      </div>
    `);
  }

  // DOM section
  if (diagnostics.dom) {
    sections.push(`
      <div class="diagnostic-section">
        <h3>DOM State</h3>
        <ul>
          <li><strong>Battle State:</strong> ${diagnostics.dom.battleState ?? "null"}</li>
          <li><strong>Has Next Button:</strong> ${diagnostics.dom.hasNextButton ? "Yes" : "No"}</li>
          <li><strong>Next Button Ready:</strong> ${diagnostics.dom.nextButtonReady ? "Yes" : "No"}</li>
        </ul>
      </div>
    `);
  }

  // Snapshot section
  if (diagnostics.snapshot) {
    sections.push(`
      <div class="diagnostic-section">
        <h3>State Snapshot</h3>
        <pre>${JSON.stringify(diagnostics.snapshot, null, 2)}</pre>
      </div>
    `);
  }

  return sections.join("");
}

/**
 * Update diagnostic panel content.
 *
 * @returns {void}
 * @pseudocode
 * 1. Check if TEST_API is available
 * 2. Call getDebugInfo to get current diagnostics
 * 3. Format diagnostics as HTML
 * 4. Update panel innerHTML
 * 5. Handle errors gracefully
 */
function updatePanel() {
  if (!panelElement) return;

  try {
    // Access the same diagnostic API that tests use
    const diagnostics =
      typeof window !== "undefined" && window.__TEST_API?.inspect?.getDebugInfo
        ? window.__TEST_API.inspect.getDebugInfo()
        : null;

    const timestamp = new Date().toLocaleTimeString();
    const html = `
      <div class="diagnostic-header">
        <h2>Battle Diagnostics</h2>
        <div class="diagnostic-timestamp">Last updated: ${timestamp}</div>
        <div class="diagnostic-hint">Press Ctrl+Shift+D to hide</div>
      </div>
      <div class="diagnostic-content">
        ${formatDiagnostics(diagnostics)}
      </div>
    `;

    panelElement.innerHTML = html;
  } catch (error) {
    panelElement.innerHTML = `
      <div class="diagnostic-header">
        <h2>Battle Diagnostics</h2>
        <div class="diagnostic-error">Error updating diagnostics: ${error.message}</div>
      </div>
    `;
  }
}

/**
 * Create diagnostic panel element.
 *
 * @returns {HTMLElement} Panel element
 * @pseudocode
 * 1. Create div with diagnostic-panel class
 * 2. Apply inline styles for positioning and appearance
 * 3. Set initial hidden state
 * 4. Return element
 */
function createPanel() {
  const panel = document.createElement("div");
  panel.className = "diagnostic-panel";
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 80vh;
    background: rgba(0, 0, 0, 0.95);
    color: #00ff00;
    border: 2px solid #00ff00;
    border-radius: 8px;
    padding: 16px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    overflow-y: auto;
    z-index: 999999;
    display: none;
    box-shadow: 0 4px 16px rgba(0, 255, 0, 0.3);
  `;

  return panel;
}

/**
 * Apply styles for diagnostic panel sections.
 *
 * @returns {void}
 * @pseudocode
 * 1. Create style element if not exists
 * 2. Define CSS rules for panel sections
 * 3. Append to document head
 */
function injectStyles() {
  if (document.getElementById("diagnostic-panel-styles")) return;

  const style = document.createElement("style");
  style.id = "diagnostic-panel-styles";
  style.textContent = `
    .diagnostic-header {
      border-bottom: 1px solid #00ff00;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    
    .diagnostic-header h2 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #00ff00;
    }
    
    .diagnostic-timestamp {
      font-size: 10px;
      color: #888;
    }
    
    .diagnostic-hint {
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    }
    
    .diagnostic-section {
      margin-bottom: 16px;
    }
    
    .diagnostic-section h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #0ff;
    }
    
    .diagnostic-section ul {
      margin: 0;
      padding-left: 20px;
      list-style: none;
    }
    
    .diagnostic-section li {
      margin: 4px 0;
    }
    
    .diagnostic-section strong {
      color: #fff;
    }
    
    .diagnostic-section pre {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #333;
      border-radius: 4px;
      padding: 8px;
      overflow-x: auto;
      font-size: 11px;
      max-height: 300px;
    }
    
    .diagnostic-error {
      color: #ff0000;
      padding: 8px;
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid #ff0000;
      border-radius: 4px;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Toggle diagnostic panel visibility.
 *
 * @returns {void}
 * @pseudocode
 * 1. If panel doesn't exist, create and inject it
 * 2. Toggle visibility flag
 * 3. Update display style
 * 4. Start/stop update interval
 * 5. Update panel content if visible
 */
function togglePanel() {
  if (!panelElement) {
    panelElement = createPanel();
    injectStyles();
    document.body.appendChild(panelElement);
  }

  isVisible = !isVisible;
  panelElement.style.display = isVisible ? "block" : "none";

  // Update diagnostics every 500ms when visible
  if (isVisible) {
    updatePanel();
    updateInterval = setInterval(updatePanel, 500);
  } else {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }
}

/**
 * Handle keyboard shortcut for toggling panel.
 *
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {void}
 * @pseudocode
 * 1. Check for Ctrl+Shift+D combination
 * 2. Prevent default browser behavior
 * 3. Toggle panel visibility
 */
function handleKeyboardShortcut(event) {
  // Ctrl+Shift+D or Cmd+Shift+D
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "D") {
    event.preventDefault();
    togglePanel();
  }
}

/**
 * Initialize diagnostic panel (development mode only).
 *
 * @returns {void}
 * @pseudocode
 * 1. Check if in development environment
 * 2. Register keyboard shortcut listener
 * 3. Log initialization message
 * @public
 */
export function initDiagnosticPanel() {
  if (!isDevelopmentEnvironment()) {
    return;
  }

  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  // Register keyboard shortcut
  document.addEventListener("keydown", handleKeyboardShortcut);

  // Log initialization (only in development)
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info(
      "[DiagnosticPanel] Initialized. Press Ctrl+Shift+D to toggle diagnostics overlay."
    );
  }
}

/**
 * Cleanup diagnostic panel (for testing).
 *
 * @returns {void}
 * @pseudocode
 * 1. Remove keyboard listener
 * 2. Clear update interval
 * 3. Remove panel element
 * 4. Reset state
 * @public
 */
export function cleanupDiagnosticPanel() {
  document.removeEventListener("keydown", handleKeyboardShortcut);

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (panelElement && panelElement.parentNode) {
    panelElement.parentNode.removeChild(panelElement);
  }

  panelElement = null;
  isVisible = false;
}
