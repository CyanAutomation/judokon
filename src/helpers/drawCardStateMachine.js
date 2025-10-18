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
 * @param {HTMLElement | null | undefined} drawButton - The draw button element to update.
 * @param {string} text - The new text content for the button.
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
 * @param {HTMLElement} drawButton - The draw button element
 * @returns {{currentState: string, transition: (nextState: string) => void}}
 * @throws {Error} If transition is invalid (e.g., SUCCESS → DRAWING)
 */
export function createDrawCardStateMachine(drawButton) {
  let currentState = "IDLE";

  const states = {
    IDLE: {
      onEnter() {
        drawButton.disabled = false;
        drawButton.removeAttribute("aria-disabled");
        drawButton.classList.remove("is-loading");
        updateDrawButtonLabel(drawButton, "Draw Card!");
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

  return {
    get currentState() {
      return currentState;
    },
    transition
  };
}
