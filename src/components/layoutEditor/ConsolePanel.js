/**
 * ConsolePanel - In-editor console logging.
 *
 * @summary Captures and displays log messages (info, warn, error) in a panel at the bottom.
 * Provides clear button to reset logs.
 *
 * @pseudocode
 * 1. Append log messages to console-logs element with appropriate class.
 * 2. Limit stored messages to prevent memory bloat.
 * 3. Auto-scroll to latest message.
 * 4. Clear all logs on button click.
 */

const MAX_LOGS = 100;

export class ConsolePanel {
  constructor(containerElement) {
    this.container = containerElement;
    this.logsContainer = containerElement.querySelector("#consoleLogs");
    this.clearBtn = containerElement.querySelector("#clearConsoleBtn");
    this.logs = [];

    this.clearBtn.addEventListener("click", () => this.clear());
  }

  log(message, level = "info") {
    const logDiv = document.createElement("div");
    logDiv.className = `console-log ${level}`;
    logDiv.textContent = message;

    this.logsContainer.appendChild(logDiv);
    this.logs.push(message);

    // Limit stored logs
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
      if (this.logsContainer.firstChild) {
        this.logsContainer.removeChild(this.logsContainer.firstChild);
      }
    }

    // Auto-scroll to bottom
    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
  }

  info(message) {
    this.log(message, "info");
  }

  warn(message) {
    this.log(message, "warn");
  }

  error(message) {
    this.log(message, "error");
  }

  clear() {
    this.logsContainer.innerHTML = "";
    this.logs = [];
  }
}
