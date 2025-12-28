/**
 * ValidationOverlay - Real-time validation error display.
 *
 * @summary Shows validation errors from layout schema checks.
 * Displays messages in a banner above the canvas.
 *
 * @pseudocode
 * 1. Take error list and display in message element.
 * 2. Clear message when no errors.
 * 3. Auto-hide after timeout (optional).
 */

export class ValidationOverlay {
  constructor(messageElement) {
    this.messageElement = messageElement;
  }

  showErrors(errors) {
    if (!errors || errors.length === 0) {
      this.clear();
      return;
    }

    const message = errors.join("; ");
    this.messageElement.textContent = `Validation errors: ${message}`;
  }

  clear() {
    this.messageElement.textContent = "";
  }
}
