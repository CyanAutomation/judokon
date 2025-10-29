/**
 * State machine for managing the draw card operation lifecycle.
 *
 * @summary Manages explicit state transitions (IDLE → DRAWING → SUCCESS|ERROR → IDLE)
 * with associated UI updates. Centralizes button state management and ensures
 * consistency across all code paths.
 *
 * @pseudocode
 * 1. Define four states: IDLE, DRAWING, SUCCESS, ERROR
 * 2. Each state has onEnter handler that updates button UI
 * 3. Validate transitions against allowed paths
 * 4. Throw on invalid transitions to catch bugs early
 * 5. Expose currentState getter and transition() method
 */

/**
 * Update the draw button's label text while supporting legacy markup structures.
 *
 * @summary Attempts to update the nested `.button-label` element when present,
 * otherwise falls back to updating the button element directly.
 *
 * @pseudocode
 * 1. If drawButton is falsy, exit early
 * 2. Query for optional `.button-label` descendant
 * 3. When found, update descendant textContent
 * 4. Otherwise, update button textContent directly
 * @param {HTMLElement | null | undefined} drawButton - The draw button element to update.
 * @param {string} text - The new text content for the button.
 * @returns {void}
 */
export function updateDrawButtonLabel(drawButton, text) {
  if (!drawButton) return;
  const label = drawButton.querySelector?.(".button-label");
  if (label) {
    label.textContent = text;
  } else {
    drawButton.textContent = text;
  }
}

/**
 * Create a state machine for the draw card operation.
 *
 * @summary Encapsulates state transitions with UI side effects. All button state
 * changes are driven by state transitions, ensuring consistency.
 *
 * @pseudocode
 * 1. Initialize currentState to "IDLE"
 * 2. Define states map with onEnter handlers mutating button attributes
 * 3. Configure validTransitions adjacency list
 * 4. Implement transition() to validate and apply state changes
 * 5. Trigger initial state's onEnter and expose public API
 *
 * @param {HTMLElement} drawButton - The draw button element
 * @returns {{currentState: string, transition: (nextState: string) => void}}
 * @throws {Error} If transition is invalid (e.g., SUCCESS → DRAWING)
 */
function getIdleLabel(drawButton) {
  const override = drawButton?.dataset?.drawButtonIdleLabel;
  if (typeof override === "string" && override.trim()) {
    return override;
  }
  return "Draw Card!";
}

export function createDrawCardStateMachine(drawButton) {
  let currentState = "IDLE";

  const states = {
    IDLE: {
      onEnter() {
        drawButton.disabled = false;
        drawButton.removeAttribute("aria-disabled");
        drawButton.classList.remove("is-loading");
        updateDrawButtonLabel(drawButton, getIdleLabel(drawButton));
        drawButton.removeAttribute("aria-busy");
      }
    },
    DRAWING: {
      onEnter() {
        drawButton.disabled = true;
        drawButton.setAttribute("aria-disabled", "true");
        drawButton.classList.add("is-loading");
        updateDrawButtonLabel(drawButton, "Drawing…");
        drawButton.setAttribute("aria-busy", "true");
      }
    },
    SUCCESS: {
      onEnter() {
        // Keep button disabled while animation plays / operation completes
        drawButton.disabled = true;
        drawButton.setAttribute("aria-disabled", "true");
        drawButton.setAttribute("aria-busy", "true");
      }
    },
    ERROR: {
      onEnter() {
        // Error state: button disabled but no aria-busy
        drawButton.disabled = true;
        drawButton.setAttribute("aria-disabled", "true");
        drawButton.removeAttribute("aria-busy");
      }
    }
  };

  // Define valid transitions
  const validTransitions = {
    IDLE: ["DRAWING"],
    DRAWING: ["SUCCESS", "ERROR"],
    SUCCESS: ["IDLE"],
    ERROR: ["IDLE"]
  };

  /**
   * Transition to a new state.
   *
   * @pseudocode
   * 1. Validate that nextState exists in states map
   * 2. Check if transition is in validTransitions for currentState
   * 3. Update currentState
   * 4. Call onEnter handler for the new state
   *
   * @param {string} nextState - The target state
   * @throws {Error} If state is unknown or transition is invalid
   */
  function transition(nextState) {
    if (!states[nextState]) {
      throw new Error(`Unknown state: ${nextState}`);
    }

    if (!validTransitions[currentState]?.includes(nextState)) {
      throw new Error(
        `Invalid transition: ${currentState} → ${nextState}. Valid: ${validTransitions[currentState]?.join(", ")}`
      );
    }

    currentState = nextState;
    states[nextState].onEnter?.();
  }

  // Initialize to IDLE state
  states[currentState].onEnter?.();

  return {
    get currentState() {
      return currentState;
    },
    transition
  };
}
