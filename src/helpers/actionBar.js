/**
 * Battle Action Bar Component
 *
 * @fileoverview Implements the unified action bar for all battle modes (Classic, CLI, Bandit, Quick).
 * The Action Bar is a 7-button control surface:
 * - Leftmost: Options button (opens settings modal)
 * - Center: 5 stat buttons (Power, Speed, Technique, Kumi-kata, Ne-waza)
 * - Rightmost: Action button (Start, Draw, Next)
 *
 * @description
 * The component:
 * - Observes the battle engine state and updates button states accordingly
 * - Provides keyboard shortcuts (1-5 for stats, O for options, Enter/Space for action)
 * - Exposes data-* attributes for testing and observability
 * - Supports theming via .action-bar--{mode} CSS classes
 * - Handles accessibility with ARIA labels and focus management
 *
 * @pseudocode
 * 1. Create container with 7 buttons in fixed order
 * 2. Wire to battle engine events for state synchronization
 * 3. Expose click handlers for each button type
 * 4. Attach keyboard event listeners for shortcuts
 * 5. Update visual state (enabled/disabled) based on engine state
 * 6. Provide destroy() method to clean up listeners
 */

import { STATS } from "./BattleEngine.js";
import logger from "./logger.js";

/**
 * @typedef {object} ActionBarHandlers
 * @property {(stat: string) => void} [onStatSelected] - Invoked when a stat button is pressed.
 * @property {() => void} [onActionClick] - Invoked when the action button is pressed.
 * @property {() => void} [onOptionsClick] - Invoked when the options button is pressed.
 */

/**
 * @typedef {object} ActionBarOptions
 * @property {IBattleEngine} engine - Active battle engine instance that emits round events.
 * @property {"classic"|"cli"|"bandit"|"quick"} [mode="classic"] - Rendering mode that controls styling.
 * @property {HTMLElement} [container=document.body] - Element that receives the rendered action bar.
 * @property {ActionBarHandlers} [handlers={}] - Callback hooks for UI interactions.
 */

/**
 * @typedef {object} ActionBarState
 * @property {boolean} statButtonsEnabled - Whether stat buttons currently accept input.
 * @property {"start"|"next"|"draw"|"done"} actionState - Current action button state (start, next, draw, done).
 * @property {boolean} actionButtonEnabled - Whether the action button is interactive.
 * @property {string} mode - Rendering mode currently applied to the component.
 */

/**
 * @typedef {object} ActionBarAPI
 * @property {() => HTMLElement} render - Render the action bar and return the root element.
 * @property {() => void} destroy - Tear down the component and listeners.
 * @property {(state?: {statSelectionRequired?: boolean, actionState?: "start"|"next"|"draw"|"done", actionDisabled?: boolean}) => void} update - Apply an explicit engine state snapshot.
 * @property {(enabled: boolean) => void} setStatButtonsEnabled - Enable or disable stat selection controls.
 * @property {(state: "start"|"next"|"draw"|"done", disabled?: boolean) => void} setActionButtonState - Update the action button state.
 * @property {() => ActionBarState} getState - Snapshot the current internal state.
 * @property {HTMLElement|null} element - Current DOM element reference or null when unrendered.
 */

const STAT_LABELS = {
  power: "Power",
  speed: "Speed",
  technique: "Technique",
  kumikata: "Kumi-kata",
  newaza: "Ne-waza"
};

const ACTION_LABELS = {
  start: "Start",
  next: "Next",
  draw: "Draw",
  done: "Done"
};

/**
 * Create a battle action bar component.
 *
 * @param {ActionBarOptions} [options={}] - Configuration for rendering and callbacks.
 * @returns {ActionBarAPI} Component instance exposing lifecycle and state helpers.
 *
 * @pseudocode
 * 1. Validate required engine and mode inputs
 * 2. Initialize internal state containers
 * 3. Lazily construct DOM and subscribe to engine events on render()
 * 4. Expose helpers for updating state and destroying listeners
 *
 * @throws {Error} If engine is not provided or mode is invalid.
 */
export function createActionBar(options = {}) {
  const { engine, mode = "classic", container = document.body, handlers = {} } = options;

  if (!engine) {
    throw new Error("Battle engine instance required for ActionBar");
  }

  const validModes = ["classic", "cli", "bandit", "quick"];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid battle mode: ${mode}`);
  }

  // Internal state
  let element = null;
  let buttonElements = {};
  let currentActionState = "next"; // next, start, draw, done
  let isDestroyed = false;
  let statButtonsEnabled = false;
  let actionButtonEnabled = true;

  // Event listeners to clean up
  const boundListeners = new Map();

  /**
   * Create the action bar DOM structure.
   *
   * @pseudocode
   * 1. Create a container div with mode class
   * 2. Create options button (leftmost)
   * 3. Create 5 stat buttons (center)
   * 4. Create action button (rightmost)
   * 5. Set initial data-* attributes
   * 6. Return the container element
   *
   * @private
   * @returns {HTMLElement}
   */
  function createDOM() {
    const actionBar = document.createElement("div");
    actionBar.className = `action-bar action-bar--${mode}`;
    actionBar.setAttribute("role", "toolbar");
    actionBar.setAttribute("aria-label", "Battle controls");
    actionBar.setAttribute("data-action-bar-mode", mode);

    // Options button (leftmost)
    const optionsBtn = document.createElement("button");
    optionsBtn.className = "action-bar__button action-bar__button--options";
    optionsBtn.setAttribute("aria-label", "Options");
    optionsBtn.setAttribute("data-action-button-type", "options");
    optionsBtn.setAttribute("data-action-button-id", "options");
    optionsBtn.textContent = "⚙";
    optionsBtn.addEventListener("click", handleOptionsClick);
    actionBar.appendChild(optionsBtn);
    buttonElements.options = optionsBtn;

    // Stat buttons (center)
    const statsContainer = document.createElement("div");
    statsContainer.className = "action-bar__stats-group";
    statsContainer.setAttribute("role", "group");
    statsContainer.setAttribute("aria-label", "Stat buttons");

    STATS.forEach((stat, index) => {
      const btn = document.createElement("button");
      btn.className = "action-bar__button action-bar__button--stat";
      btn.setAttribute("aria-label", STAT_LABELS[stat]);
      btn.setAttribute("data-action-button-type", "stat");
      btn.setAttribute("data-action-button-id", stat);
      btn.setAttribute("data-stat-index", index);
      btn.setAttribute("data-stat-enabled", "false");
      btn.textContent = STAT_LABELS[stat];
      btn.disabled = true;

      btn.addEventListener("click", () => handleStatClick(stat));
      statsContainer.appendChild(btn);
      buttonElements[stat] = btn;
    });
    actionBar.appendChild(statsContainer);

    // Action button (rightmost)
    const actionBtn = document.createElement("button");
    actionBtn.className = "action-bar__button action-bar__button--action";
    actionBtn.setAttribute("aria-label", "Next round");
    actionBtn.setAttribute("data-action-button-type", "action");
    actionBtn.setAttribute("data-action-button-id", "action");
    actionBtn.setAttribute("data-action-state", currentActionState);
    actionBtn.textContent = "Next";
    actionBtn.addEventListener("click", handleActionClick);
    actionBar.appendChild(actionBtn);
    buttonElements.action = actionBtn;

    return actionBar;
  }

  /**
   * Handle stat button click.
   *
   * @pseudocode
   * 1. Guard: if stat buttons are not enabled, ignore
   * 2. Call handler if provided
   * 3. Log selection with stat name
   *
   * @private
   * @param {string} stat - The stat name (power, speed, etc.)
   */
  function handleStatClick(stat) {
    if (!statButtonsEnabled || isDestroyed) return;
    if (handlers.onStatSelected) {
      try {
        handlers.onStatSelected(stat);
      } catch (error) {
        logger.error("ActionBar stat handler error", { stat, error: error.message });
      }
    }
  }

  /**
   * Handle options button click.
   *
   * @pseudocode
   * 1. Guard: if destroyed, ignore
   * 2. Call handler if provided
   *
   * @private
   */
  function handleOptionsClick() {
    if (isDestroyed) return;
    if (handlers.onOptionsClick) {
      try {
        handlers.onOptionsClick();
      } catch (error) {
        logger.error("ActionBar options handler error", { error: error.message });
      }
    }
  }

  /**
   * Handle action button click.
   *
   * @pseudocode
   * 1. Guard: if action button is disabled or destroyed, ignore
   * 2. Call handler if provided
   *
   * @private
   */
  function handleActionClick() {
    if (!actionButtonEnabled || isDestroyed) return;
    if (handlers.onActionClick) {
      try {
        handlers.onActionClick(currentActionState);
      } catch (error) {
        logger.error("ActionBar action handler error", { error: error.message });
      }
    }
  }

  /**
   * Handle keyboard shortcut events.
   *
   * @pseudocode
   * 1. Check for stat shortcuts (1-5)
   * 2. Check for options shortcut (O)
   * 3. Check for action shortcut (Enter, Space)
   * 4. Prevent default for handled keys
   *
   * @private
   * @param {KeyboardEvent} e
   */
  function handleKeyDown(e) {
    if (isDestroyed) return;

    const key = e.key?.toLowerCase?.();

    // Check stat shortcuts (1-5)
    if (key >= "1" && key <= "5") {
      const statIndex = parseInt(key) - 1;
      if (statIndex < STATS.length) {
        const stat = STATS[statIndex];
        if (stat && statButtonsEnabled) {
          e.preventDefault();
          handleStatClick(stat);
          return;
        }
      }
    }

    // Check options shortcut (O)
    if (key === "o") {
      e.preventDefault();
      handleOptionsClick();
      return;
    }

    // Check action shortcut (Enter or Space)
    if (key === "enter" || key === " ") {
      const isInputField =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";
      if (actionButtonEnabled && !isInputField) {
        e.preventDefault();
        handleActionClick();
        return;
      }
    }
  }

  /**
   * Subscribe to engine state changes.
   *
   * @pseudocode
   * 1. Listen to engine "roundPrompt" event → enable stat buttons
   * 2. Listen to engine "statSelected" or "roundEnd" event → disable stat buttons
   * 3. Listen to engine state changes for action button label/state
   *
   * @private
   */
  function subscribeToEngine() {
    if (!engine || !engine.on) {
      logger.warn("ActionBar: Engine does not support subscriptions");
      return;
    }

    // Create bound listeners for cleanup
    const boundOnRoundStart = () => updateStatButtonsState(true);
    const boundOnRoundEnd = () => updateStatButtonsState(false);
    const boundOnStatSelected = () => updateStatButtonsState(false);

    boundListeners.set("roundPrompt", boundOnRoundStart);
    boundListeners.set("roundEnd", boundOnRoundEnd);
    boundListeners.set("statSelected", boundOnStatSelected);

    engine.on?.("roundPrompt", boundOnRoundStart);
    engine.on?.("roundEnd", boundOnRoundEnd);
    engine.on?.("statSelected", boundOnStatSelected);
  }

  /**
   * Update stat button enabled state.
   *
   * @pseudocode
   * 1. Set statButtonsEnabled flag
   * 2. Update disabled attribute on all stat buttons
   * 3. Update data-stat-enabled attribute
   *
   * @private
   * @param {boolean} enabled
   */
  function updateStatButtonsState(enabled) {
    statButtonsEnabled = enabled;

    STATS.forEach((stat) => {
      const btn = buttonElements[stat];
      if (btn) {
        btn.disabled = !enabled;
        btn.setAttribute("data-stat-enabled", enabled ? "true" : "false");
      }
    });
  }

  /**
   * Update action button state.
   *
   * @pseudocode
   * 1. Update currentActionState and label based on engine state
   * 2. Update disabled attribute
   * 3. Update data-action-state attribute
   *
   * @private
   * @param {string} state - Action state: "start", "next", "draw", "done"
   * @param {boolean} [disabled=false] - Whether button should be disabled
   */
  function updateActionButtonState(state, disabled = false) {
    currentActionState = state;
    actionButtonEnabled = !disabled;

    const btn = buttonElements.action;
    if (btn) {
      btn.textContent = ACTION_LABELS[state] || "Next";
      btn.disabled = disabled;
      btn.setAttribute("data-action-state", state);
      btn.setAttribute("aria-disabled", disabled ? "true" : "false");
    }
  }

  /**
   * Render the action bar into the container.
   *
   * @pseudocode
   * 1. Create DOM elements
   * 2. Attach to container
   * 3. Subscribe to engine events
   * 4. Attach keyboard listeners
   * 5. Set initial state
   *
   * @returns {HTMLElement} The rendered action bar element
   */
  function render() {
    if (element) return element; // Already rendered

    element = createDOM();
    container.appendChild(element);

    // Subscribe to engine events
    subscribeToEngine();

    // Attach global keyboard listeners
    const boundKeyDown = (e) => handleKeyDown(e);
    document.addEventListener("keydown", boundKeyDown);
    boundListeners.set("keydown", boundKeyDown);

    // Set initial state
    updateStatButtonsState(false);
    updateActionButtonState("next", false);

    return element;
  }

  /**
   * Update the action bar based on current engine state.
   *
   * @pseudocode
   * 1. Query engine for current state
   * 2. Update stat buttons if needed
   * 3. Update action button label/state if needed
   *
   * @param {object} [state] - Explicit state to update to (optional)
   */
  function update(state) {
    if (!element || isDestroyed) return;

    // If state is provided, update from it
    if (state) {
      if (state.hasOwnProperty("statSelectionRequired")) {
        updateStatButtonsState(state.statSelectionRequired);
      }
      if (state.hasOwnProperty("actionState")) {
        updateActionButtonState(state.actionState, state.actionDisabled ?? false);
      }
    }
  }

  /**
   * Enable or disable stat buttons.
   *
   * @pseudocode
   * 1. Update stat buttons enabled state
   * 2. Update UI accordingly
   *
   * @param {boolean} enabled
   */
  function setStatButtonsEnabled(enabled) {
    updateStatButtonsState(enabled);
  }

  /**
   * Set the action button state.
   *
   * @pseudocode
   * 1. Update action button state and label
   *
   * @param {string} state - "start", "next", "draw", "done"
   * @param {boolean} [disabled=false]
   */
  function setActionButtonState(state, disabled = false) {
    updateActionButtonState(state, disabled);
  }

  /**
   * Get the current action bar state.
   *
   * @pseudocode
   * 1. Return snapshot of current state
   *
   * @returns {object}
   */
  function getState() {
    return {
      statButtonsEnabled,
      actionState: currentActionState,
      actionButtonEnabled,
      mode
    };
  }

  /**
   * Destroy the action bar and clean up listeners.
   *
   * @pseudocode
   * 1. Mark as destroyed
   * 2. Remove DOM element
   * 3. Unsubscribe from engine events
   * 4. Remove keyboard listeners
   * 5. Clear all references
   *
   */
  function destroy() {
    if (isDestroyed) return;

    isDestroyed = true;

    // Remove DOM element
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }

    // Unsubscribe from engine events
    if (engine && engine.off) {
      boundListeners.forEach((listener, eventName) => {
        if (eventName !== "keydown") {
          engine.off?.(eventName, listener);
        }
      });
    }

    // Remove keyboard listener
    const keydownListener = boundListeners.get("keydown");
    if (keydownListener) {
      document.removeEventListener("keydown", keydownListener);
    }

    // Clear references
    boundListeners.clear();
    buttonElements = {};
    element = null;
  }

  // Return public API
  return {
    render,
    destroy,
    update,
    setStatButtonsEnabled,
    setActionButtonState,
    getState,
    get element() {
      return element;
    }
  };
}
