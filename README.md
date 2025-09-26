# JU-DO-KON! 🥋

**JU-DO-KON!** is a fast-paced, web-based card game, featuring real-life elite judoka. Designed for ages 8–12, the game uses simplified stats, vibrant collectible cards, and a player-vs-computer battle format. First to win 10 rounds takes the match!

Try the game live in your browser: [JU-DO-KON!](https://cyanautomation.github.io/judokon/)

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CyanAutomation/judokon/runUnitTests.yml?logo=githubactions&style=for-the-badge&label=Unit%20Tests)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CyanAutomation/judokon/eslint.yml?logo=eslint&style=for-the-badge&label=ESLint)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CyanAutomation/judokon/pages%2Fpages-build-deployment?logo=githubpages&style=for-the-badge&label=GitHub%20Pages)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fcyanautomation.github.io%2Fjudokon%2F&logo=googlechrome&style=for-the-badge&label=JU-DO-KON!%20Website)
![GitHub last commit](https://img.shields.io/github/last-commit/CyanAutomation/judokon?logo=github&style=for-the-badge&color=blue)
![GitHub repo size](https://img.shields.io/github/repo-size/CyanAutomation/judokon?logo=github&style=for-the-badge)
![Static Badge](https://img.shields.io/badge/License-gnu_general_public_license_v3.0-blue?logo=gnu&style=for-the-badge)
![Maintenance](https://img.shields.io/maintenance/yes/2025?style=for-the-badge)

---

## 📖 About the Game

JU-DO-KON! is a strategic digital card game inspired by Top Trumps, featuring judo athletes from around the world. Each card is assigned attributes like **Power**, **Technique**, **Speed**, and more—allowing players to battle judoka in quick, decisive rounds. The game is built using modern **HTML/CSS/JavaScript** and runs as a static site on GitHub Pages without any bundler.

### Classic Battle Start

When you open `src/pages/battleJudoka.html`, a modal prompts you to choose the match length (win target) before the first round. Options are sourced from `src/data/battleRounds.js`. Selecting an option sets the engine’s points-to-win and starts the pre-round countdown.

For debugging or automated tests, append `?autostart=1` to `battleJudoka.html` to skip the modal and begin a default-length match immediately.

Note on Next button behavior:
- The `Next` button advances only during the inter-round cooldown. Clicking it cancels any remaining cooldown and immediately starts the next round, regardless of the `skipRoundCooldown` setting.
- It remains disabled while choosing a stat to avoid skipping the cooldown logic accidentally. The cooldown enables `Next` (or auto-advances in test mode); do not expect `Next` to be ready during stat selection.

### Headless & Test Modes

For simulation runs without UI waits, enable headless mode:

```js
import { setHeadlessMode } from "./src/helpers/headlessMode.js";
import { setTestMode } from "./src/helpers/testModeUtils.js";

setHeadlessMode(true); // zero delays
setTestMode(true); // deterministic RNG
```

Headless mode forces cooldowns to `0` and skips opponent reveal sleeps. Test mode remains responsible for seeding randomness and enforces a minimum one-second cooldown when headless mode is off. Disable headless mode to restore normal pacing.

Stat selections now dispatch events and rely on the state machine for round resolution. `handleStatSelection` performs direct resolution only when the orchestrator is absent (e.g., certain tests or CLI utilities).

See [design/battleMarkup.md](design/battleMarkup.md) for the canonical DOM ids used by classic battle scripts.

## 🔌 Engine API

```js
import BattleEngine from "./src/helpers/BattleEngine.js";
import { renderMessage } from "./src/ui/renderMessage.js";

const engine = new BattleEngine({ pointsToWin: 3 });

const messages = {
  roundStarted: ({ round }) => `Round ${round} begins`,
  matchEnded: ({ outcome }) => `Match ${outcome}`,
};

engine.on("roundStarted", (data) => {
  renderMessage("#status", messages.roundStarted(data));
});

engine.on("matchEnded", (data) => {
  renderMessage("#status", messages.matchEnded(data));
});

engine.start();
```

`BattleEngine` contains only match logic. A mode subscribes to events and maps them to UI helpers like `renderMessage`, keeping presentation separate from engine code.

---

## 🚧 Development Status

The game is currently in active development. New features are being rolled out behind feature flags, with ongoing testing, design refinement, and gameplay enhancements.

---

## 👩‍💻 Contributing

Whether you're a developer, designer, tester, writer—or an AI agent—we welcome contributions to JU-DO-KON!

For full contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

### Terminal Safety

When running terminal searches like `grep` or `find`, exclude `client_embeddings.json` and `offline_rag_metadata.json` to prevent output overflow. See [AGENTS.md](./AGENTS.md#terminal-safety) for details.

---

## 🤖 AI Agent Compatibility

JU-DO-KON! welcomes structured, scoped contributions from AI agents. Agents are encouraged to help improve gameplay logic, design consistency, data integrity, and documentation.

Typical agent tasks include:

- Performing PRD evaluations and feature readiness checks
- Auditing tooltips and `data-*` observability hooks
- Validating feature flags and DOM compatibility
- Ensuring judoka stat data follows game rules

AI agents should begin by reading:

- [AGENTS.md](./AGENTS.md) for task guides and scope
- [CONTRIBUTING.md](./CONTRIBUTING.md) for commit conventions
- [architecture.md](./architecture.md) for layout structure and observability models

---

## 🧭 Quickstart for AI Agents

### 🔑 Entry Points

- `/src/pages/settings.html` – UI for toggling feature flags
- `/src/config/settingsDefaults.js` – `DEFAULT_SETTINGS` source of truth for defaults
- `/data/tooltips.json` – Tooltip content (auditable by agents)
- `/data/judoka.json` – Card data for stat logic
- Typed data modules in `/src/data`: `battleRounds.js`, `gameTimers.js`, `navigationItems.js`, `statNames.js`, `japaneseConverter.js` — export arrays with JSDoc type guarantees
- `/components/` – Frontend logic with `data-*` hooks for observability

### 🧪 Common Tasks

- ✅ Check for missing tooltips on interactive elements
- ✅ Validate stat blocks against rarity rules
- ✅ Generate or evaluate PRDs for new features

Before committing code changes, run the full validation suite to verify docs, formatting, lint, tests, and contrast.
For the complete command reference and troubleshooting, see [docs/validation-commands.md](./docs/validation-commands.md).
For contributor-specific guidance, see [CONTRIBUTING.md](./CONTRIBUTING.md).

**Quick validation (essential checks):**
```bash
npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast
```

This suite includes a DOM regression test (`tests/pages/battleJudoka.dom.test.js`) that loads `battleJudoka.html` and fails if required IDs (`next-button`, `stat-help`, `quit-match-button`, `stat-buttons`) are missing.

### Classic Battle CLI (text-first)

- Page: `src/pages/battleCLI.html` – terminal-style UI that reuses the Classic Battle engine/state machine.
- Controls: number keys [1–5] select stats, Enter/Space advances, Q quits, H toggles a help panel, and Esc closes help or quit dialogs. Stats can also be selected by clicking or tapping, and rounds can be advanced with a click. Closing the help panel with its button ignores the next background click to avoid accidental advancement.
- State badge: `#battle-state-badge` reflects the current machine state.
- Bottom line: snackbars render as a single status line using `#snackbar-container`.
- Win target: choose 5/10/15 from the header; persisted in localStorage under `battleCLI.pointsToWin`.
- Optional verbose log: enable header toggle to record recent state transitions.
- Bootstrap helpers: `autostartBattle()`, `renderStatList()`, and `restorePointsToWin()` orchestrate CLI startup.

### Snackbar Container

Pages that display snackbars must include a persistent container near the end of `<body>`:

```html
<div id="snackbar-container" role="status" aria-live="polite"></div>
```

Place this element **before** any script that may trigger snackbars during page load to avoid creating a fallback container with duplicate IDs. `showSnackbar` and `updateSnackbar` reuse this element for notifications.

## Settings API

Settings are loaded once and cached for synchronous use. Default values come
from `DEFAULT_SETTINGS` in `src/config/settingsDefaults.js` and are overlaid
with any persisted values. Helpers in `src/helpers/settingsUtils.js` provide
safe access:

- `getSetting(key)` – read a setting value from the cache.

Feature flags are managed through `src/helpers/featureFlags.js`:

- `isEnabled(flag)` – synchronous check for a flag's enabled state.
- `setFlag(flag, value)` – persist a flag change and emit an update.
- `featureFlagsEmitter` – listen for `change` events when flags toggle.

Call `loadSettings()` during startup to populate the cache before using
these helpers. Pages should rely on `featureFlags.isEnabled` rather than
accessing `settings.featureFlags` directly.

### Display Modes

- Available modes: `Light`, `Dark`, and `Retro`.
- Retro emulates a terminal-style green-on-black palette and replaces the former High Contrast mode.
- The current mode is exposed via `document.body.dataset.theme` (e.g., `data-theme="retro"`).

> `navigationItems.js` and `gameModes.json` must be present on the server; otherwise, the game loads built-in fallback data.

## Battle Engine Events API

The battle engine exposes a lightweight event emitter. Subscribe via
`on(event, handler)` from `src/helpers/battleEngineFacade.js`:

- `roundStarted` → `{ round }`
- `roundEnded` → `{ delta, outcome, matchEnded, playerScore, opponentScore }`
- `timerTick` → `{ remaining, phase: 'round' | 'cooldown' }`
- `matchEnded` → same payload as `roundEnded`
- `error` → `{ message }`

## 🔎 Using the Vector RAG System

The project includes a high-performance vector RAG system with 16,000+ indexed chunks covering documentation, code standards, and game rules. Before scanning the repo for answers, use the [`queryRag`](./src/helpers/queryRag.js) helper:

```javascript
import queryRag from "./src/helpers/queryRag.js";
const matches = await queryRag("How does the battle engine work?");
```

**Command line usage:**
```bash
npm run rag:query "How does the battle engine work?"
```

**Performance:** 15x faster than manual exploration (2-second queries), with 62.5% accuracy for implementation queries and 95% for design docs.

For complete RAG system documentation, offline usage, evaluation tools, and workflow diagrams, see **[Operations & Tooling](./design/productRequirementsDocuments/prdVectorDatabaseRAG.md#operations--tooling)** and **[UI Workflow](./design/productRequirementsDocuments/prdVectorDatabaseRAG.md#ui-workflow)** in the Vector Database PRD.

## ⚡ Module Loading Policy

Use static imports for hot paths and always-required modules; use dynamic imports with preload for optional or heavy features. See the canonical [Module Loading Policy for Agents](./AGENTS.md#module-loading-policy-for-agents) for the full policy.

## 🧪 Testing

The game includes a **Skip** button that bypasses the current round and cooldown timers. Use it to fast-forward through matches when debugging or running rapid gameplay tests.

### CSS tooling

Color contrast tests parse custom properties with PostCSS directly, relying on standard CSS tooling instead of a bespoke parser.

### Timer utilities

Classic Battle timer logic lives in `src/helpers/classicBattle/timerService.js` and its helpers:

- `timerUtils.js` — shared state snapshot and readiness helpers.
- `autoSelectHandlers.js` — stat-selection fallbacks when timers drift or stall.

The CLI's pause/resume flow uses `pauseTimers` to clear active selection and cooldown timers while recording their remaining time. `resumeTimers` restarts them with the captured values so modals or tab switches do not lose progress.

On the Browse Judoka page, the country filter panel starts with the `hidden` attribute. When revealed, it must include `aria-label="Country filter panel"` for accessibility and Playwright tests. The country slider loads asynchronously after the panel opens.

Run all Playwright tests with:

```bash
npx playwright test
```

CLI-specific tests live in `playwright/battle-cli.spec.js` and verify the state badge, verbose log behavior, and keyboard selection flow.

### Stable readiness waits in Playwright

- Prefer `await page.evaluate(() => window.battleReadyPromise)` to detect that the Classic Battle page is fully initialized. This resolves when both the “home” and “state” parts finish booting (see `src/helpers/battleInit.js`).
- Test helper shortcuts are available in `playwright/fixtures/waits.js`:
  - `await waitForBattleReady(page)` and `await waitForSettingsReady(page)`.
  - `await waitForBattleState(page, "waitingForPlayerAction", 10000)` for machine state assertions. This helper rejects if the state isn't reached within the provided timeout, preventing browser deadlocks.
  - `await page.evaluate(() => window.statButtonsReadyPromise)` to wait until stat buttons are re-enabled for a round.
- Avoid waiting for brittle UI states like the header timer element (`#next-round-timer`) to be visible at page load. The initial pre‑match countdown is rendered via snackbar, not the header timer, and may be empty initially.
- When targeting round start readiness, it’s fine to wait for the selection prompt snackbar (e.g., “Select your move”) or `#stat-buttons[data-buttons-ready="true"]`.

### Battle Debug Panel

When the `enableTestMode` feature flag is active, a debug panel appears above the player and opponent cards with live match data. The panel includes a **Copy** button that copies all text for easy sharing.

### Stat Hotkeys

Enable the `statHotkeys` feature flag to map number keys 1–5 to stat buttons for quicker selection. Disabled by default.
Invalid numeric keys now trigger a hint: "Use 1-5, press H for help".


Screenshot suites store their baseline images in `playwright/*-snapshots/`. To skip running these comparison tests locally, set the `SKIP_SCREENSHOTS` environment variable:

```bash
SKIP_SCREENSHOTS=true npx playwright test
```

When a UI change intentionally alters a screenshot, update the stored snapshots with:

```bash
npx playwright test --update-snapshots
```

## 🔄 Updating Judoka Card Codes

Run `npm run update:codes` whenever you add or edit judoka in `src/data/judoka.json`. The script regenerates the `cardCode` for each entry and falls back to the code from judoka `id=0` if generation fails.

---

## 📎 Related Docs for Agents

- [AGENTS.md](./AGENTS.md): Agent playbooks, task types, audit checklists
- [architecture.md](./architecture.md): DOM layout, feature flags, testing hooks
- [CONTRIBUTING.md](./CONTRIBUTING.md): PR templates, commit message formats

---

## ✍️ Author Tags for AI Contributions

If you're submitting via agent automation:

- Use PR titles prefixed with `chore(agent):` or `feat(agent):` where relevant
- Clearly note which files were generated or reviewed by an agent in the PR description
- Agent feedback and logs should be included in the commit message or linked in the PR

---

## 🪪 License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE) for more details.

---

## 🙌 Thanks for Exploring JU-DO-KON!

Whether you're a contributor, player, tester, or agent—thank you for helping build something fun, strategic, and kid-friendly. We’re excited to have you on the tatami!
