export const CLI_DOM_TEMPLATE = `
  <div class="terminal-title-bar">bash — JU-DO-KON</div>
  <a href="#cli-main" class="skip-link">Skip to main content</a>
  <div id="cli-root" class="cli-root" data-round="0" data-target="0" data-test="cli-root">
    <header id="cli-header" class="cli-header" role="banner">
      <div class="cli-title">
        <a href="../../index.html" data-testid="home-link" aria-label="Return to home">Home</a>
        &nbsp;|&nbsp; Classic Battle (CLI)
        <span id="battle-state-badge" data-flag="battleStateBadge" class="state-badge" style="display: none">State: —</span>
      </div>
      <div class="cli-status" aria-live="polite" aria-atomic="true">
        <div id="cli-round">Round 0 Target: 10</div>
        <div
          id="cli-score"
          data-score-player="0"
          data-score-opponent="0"
          aria-live="polite"
          aria-atomic="true"
        >
          You: 0 Opponent: 0
        </div>
      </div>
      <div class="standard-scoreboard-nodes" style="display: none" aria-hidden="true">
        <p id="next-round-timer" aria-atomic="true" role="status"></p>
        <p id="round-counter" aria-atomic="true">Round 0</p>
        <p id="score-display" aria-live="off" aria-atomic="true">You: 0 Opponent: 0</p>
      </div>
    </header>
    <main id="cli-main" class="cli-main" role="main">
      <section aria-label="Round Status" class="cli-block">
        <div id="round-message" role="status" aria-live="polite" aria-atomic="true"></div>
        <div id="cli-countdown" role="status" aria-live="polite" data-remaining-time="0"></div>
      </section>
      <div class="ascii-sep">────────────────────────</div>
      <section aria-label="Match Settings" class="cli-block cli-settings">
        <div class="cli-settings-header d-flex align-items-center justify-content-between">
          <div class="fw-600">Match Settings</div>
          <div>
            <button
              id="cli-settings-toggle"
              data-testid="settings-button"
              aria-expanded="true"
              aria-controls="cli-settings-body"
              class="button-reset"
            >
              Settings ▾
            </button>
          </div>
        </div>
        <div id="cli-settings-body">
          <div class="cli-settings-row">
            <label for="points-select">Win target:</label>
            <select id="points-select" aria-label="Points to win" data-tooltip-id="settings.pointsToWin">
              <option value="5">5</option>
              <option value="10" selected>10</option>
              <option value="15">15</option>
            </select>
          </div>
          <div class="cli-settings-row">
            <label for="verbose-toggle">Verbose:</label>
            <input
              id="verbose-toggle"
              type="checkbox"
              aria-label="Toggle verbose logging"
              data-flag="cliVerbose"
            />
          </div>
          <div class="cli-settings-row">
            <label for="seed-input">Seed:</label>
            <div class="d-flex flex-col">
              <input
                id="seed-input"
                type="number"
                inputmode="numeric"
                aria-label="Deterministic seed (optional)"
                aria-describedby="seed-error"
                class="seed-input"
              />
              <div id="seed-error" class="seed-error"></div>
            </div>
          </div>
        </div>
      </section>
      <div class="ascii-sep">────────────────────────</div>
      <section aria-label="Stat Selection" class="cli-block">
        <div
          id="cli-stats"
          role="listbox"
          tabindex="0"
          aria-label="Select a stat with number keys 1–5"
          aria-busy="true"
          data-skeleton="true"
        >
          <div class="cli-stat skeleton" role="presentation" style="display: flex; min-height: 44px">(1) ─────────────── ─</div>
          <div class="cli-stat skeleton" role="presentation" style="display: flex; min-height: 44px">(2) ─────────────── ─</div>
          <div class="cli-stat skeleton" role="presentation" style="display: flex; min-height: 44px">(3) ─────────────── ─</div>
          <div class="cli-stat skeleton" role="presentation" style="display: flex; min-height: 44px">(4) ─────────────── ─</div>
          <div class="cli-stat skeleton" role="presentation" style="display: flex; min-height: 44px">(5) ─────────────── ─</div>
        </div>
      </section>
      <div class="ascii-sep">────────────────────────</div>
      <section aria-label="Shortcuts" id="cli-shortcuts" class="cli-block cli-settings" data-flag="cliShortcuts" hidden>
        <div class="cli-settings-header d-flex align-items-center justify-content-between">
          <div class="fw-600">Shortcuts</div>
          <div>
            <button
              id="cli-shortcuts-close"
              aria-label="Close help"
              aria-controls="cli-shortcuts-body"
              aria-expanded="false"
              class="button-reset"
            >
              ×
            </button>
          </div>
        </div>
        <div id="cli-shortcuts-body">
          <ul id="cli-help">
            <li>[1–5] Select Stat</li>
            <li>[Enter]/[Space] Next</li>
            <li>[Q] Quit</li>
            <li>[H] Toggle Help</li>
          </ul>
        </div>
      </section>
      <div class="ascii-sep">────────────────────────</div>
      <section aria-label="Verbose Log" id="cli-verbose-section" class="cli-block" data-flag="cliVerbose" hidden>
        <pre id="cli-verbose-log" aria-atomic="false" class="pre-wrap"></pre>
      </section>
      <div id="cli-prompt" role="status" aria-label="Command prompt">
        &gt; <span id="cli-cursor" aria-hidden="true">▌</span>
      </div>
    </main>
    <footer class="cli-footer" role="contentinfo">
      <div id="cli-controls-hint" aria-hidden="true">[1–5] Stats · [Enter/Space] Next · [H] Help · [Q] Quit</div>
      <div id="snackbar-container" role="status" aria-live="polite"></div>
    </footer>
    <div id="player-card" style="display: none"></div>
    <div id="opponent-card" style="display: none"></div>
    <div id="modal-container"></div>
  </div>
`;

/**
 * Create a DocumentFragment containing the Battle CLI scaffold.
 *
 * @param {Document} [doc=document] - Document used to create the fragment.
 * @returns {DocumentFragment|null}
 * @pseudocode
 * if !doc → return null
 * template = doc.createElement("template")
 * template.innerHTML = CLI_DOM_TEMPLATE
 * return template.content.cloneNode(true)
 */
export function createCliDomFragment(doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return null;
  const template = doc.createElement("template");
  template.innerHTML = CLI_DOM_TEMPLATE;
  return template.content.cloneNode(true);
}
