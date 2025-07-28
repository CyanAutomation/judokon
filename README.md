# JU-DO-KON! 🥋

**JU-DO-KON!** is a fast-paced, web-based card game, featuring real-life elite judoka. Designed for ages 8–12, the game uses simplified stats, vibrant collectible cards, and a player-vs-computer battle format. First to win 10 rounds takes the match!

Try the game live in your browser: [JU-DO-KON!](https://cyanautomation.github.io/judokon/)

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CyanAutomation/judokon/runUnitTests.yml?logo=githubactions&style=for-the-badge&label=Unit%20Tests) ![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CyanAutomation/judokon/eslint.yml?logo=eslint&style=for-the-badge&label=ESLint) ![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CyanAutomation/judokon/pages%2Fpages-build-deployment?logo=githubpages&style=for-the-badge&label=GitHub%20Pages) ![Website](https://img.shields.io/website?url=https%3A%2F%2Fcyanautomation.github.io%2Fjudokon%2F&logo=googlechrome&style=for-the-badge&label=JU-DO-KON!%20Website) ![GitHub last commit](https://img.shields.io/github/last-commit/CyanAutomation/judokon?logo=github&style=for-the-badge&color=blue) ![GitHub repo size](https://img.shields.io/github/repo-size/CyanAutomation/judokon?logo=github&style=for-the-badge) ![Static Badge](https://img.shields.io/badge/License-gnu_general_public_license_v3.0-blue?logo=gnu&style=for-the-badge) ![Maintenance](https://img.shields.io/maintenance/yes/2025?style=for-the-badge&logo=cachet&label=Currently%20Maintained)

## Table of Contents

1. [About JU-DO-KON!](#about-ju-do-kon)
2. [Features](#features)
3. [🎮 How to Play JU-DO-KON!](#how-to-play-ju-do-kon)
   - [🥋 The Rules](#-the-rules)
4. [Live Demo](#live-demo)
5. [Installation](#installation)
6. [Dependencies](#dependencies)
7. [Project Structure](#project-structure)
8. [Display Modes](#display-modes)
9. [Settings & Feature Flags](#settings--feature-flags)
10. [Browser Compatibility](#browser-compatibility)
11. [Future Plans](#future-plans)
12. [Contributing](#contributing)
13. [Changelog](#changelog)

## Quick Start

1. Make sure you have **Node 18+** and `npm` (or another package manager) installed.
2. Clone the repository, install dependencies, and launch the development server:
   ```bash
   git clone https://github.com/cyanautomation/judokon.git
   cd judokon
   npm install
   npm start  # lightweight local dev server
   # Then visit: http://localhost:5000
   ```
3. Verify formatting and linting before committing:

   ```bash
   npm run lint
   ```

   **For UI-related changes**, also verify color contrast. Make sure a local server (for example `npm start`) is running so Pa11y can access http://localhost:5000:

   ```bash
   npm run check:contrast  # runs Pa11y against http://localhost:5000
   ```

### Debug Logging

To see verbose output from the helper modules during development, enable the
`DEBUG_LOGGING` flag:

```bash
# Node/CLI
DEBUG_LOGGING=true npx vitest run
```

In the browser you can enable it from the console before loading the page:

```javascript
window.DEBUG_LOGGING = true;
```

## Screenshot Tests (On-Demand)

Run optional Playwright-based screenshot tests with:

```bash
npm run test:screenshot
```

The screenshot suite now runs once for **each browser project** configured in
`playwright.config.js`. Tests within the suite execute in parallel for faster
feedback. Snapshot images are saved under
`playwright/<spec>.spec.js-snapshots/<project>/`.

Remember **not** to commit files in `playwright/*-snapshots` when screenshots
change. Use `npx playwright test --update-snapshots` to regenerate the baseline
images locally.

Screenshot tests rely on fixture data and explicitly override `Math.random`
(see `playwright/fixtures/commonSetup.js` and
`playwright/signatureMove.spec.js`). This keeps baseline images stable so they
change only when the UI truly changes&mdash;not simply because a different
judoka was randomly selected.

Set `SKIP_SCREENSHOTS=true` to skip the screenshot suite if you only want to run
the other Playwright tests:

```bash
SKIP_SCREENSHOTS=true npm run test:screenshot
```

When using `page.evaluate` to query elements, always wait for the element to
exist (e.g., `await page.getByTestId("draw-button").waitFor()`). Otherwise
the evaluation may run before the DOM is ready and throw a `Cannot read
properties of null` error.

### Unit Test Helpers

Some helpers such as `classicBattle.js` keep match state between rounds. The
`_resetForTest()` function resets this internal state. Invoke it at the start of
any unit test that depends on the initial score or timer conditions.

### Troubleshooting Playwright Tests

A `Test timeout ... waiting for locator('#general-settings-toggle')` error usually means the Settings page failed to load or the server was unreachable. Verify that:

- **Node 18+** is installed.
- Port **5000** is free; the tests start `scripts/playwrightServer.js` automatically.
- Visiting `http://localhost:5000/src/pages/settings.html` shows the Display Settings section followed by the toggles (`#general-settings-toggle`, `#game-modes-toggle`).
- Running tests with `PWDEBUG=1` helps inspect the page when a timeout occurs.
- `strict mode violation: getByLabel('text') resolved to multiple elements`
  indicates the locator is too generic. Use `getByLabel(text, { exact: true })`
  or a more specific `getByRole` query so only one element matches.

Playwright tests clear `localStorage` at startup. If a manual run fails unexpectedly, clear `localStorage` in your browser before retrying. A static server must be reachable at http://localhost:5000 (typically via `npm start`).


## Project Structure

The repository follows a simple layout. GitHub Pages requires `index.html` to live at the project root.

- `index.html` – landing page served by GitHub Pages. Internal navigation links
  use relative paths (e.g., `../../index.html`) so the site can be served from
  any base URL.
- `src/` – contains the game logic and assets:
  - `game.js`
  - `helpers/` – small utilities (for example `lazyPortrait.js` replaces the placeholder card portraits once they enter view)
  - `components/` – small DOM factories like `Button`, `ToggleSwitch`, `Card`, the `Modal` dialog, and `StatsPanel`

    ```javascript
    import { createStatsPanel } from "./src/components/StatsPanel.js";
    const panel = createStatsPanel(
      { power: 9, speed: 8, technique: 7 },
      { ariaLabel: "Shohei Ono stats" }
    );
    document.body.appendChild(panel);
    ```

    `Card.js` applies the same design tokens for colors and spacing.

    ```javascript
    import { createCard } from "./src/components/Card.js";
    const card = createCard("<p>Hello</p>");
    document.body.appendChild(card);
    ```

    `Modal.js` exports a dialog component with keyboard focus trapping.

    ```javascript
    import { createModal } from "./src/components/Modal.js";
    const contentFragment = document.createDocumentFragment();
    const modalContent = document.createElement("p");
    modalContent.textContent = "This is a modal dialog.";
    contentFragment.appendChild(modalContent);
    const modal = createModal(contentFragment, { labelledBy: "modalTitle" });
    document.body.appendChild(modal.element);

    // Example: Wire up open() and close() methods to button clicks
    const openButton = document.createElement("button");
    openButton.textContent = "Open Modal";
    openButton.addEventListener("click", () => modal.open());
    document.body.appendChild(openButton);

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close Modal";
    closeButton.addEventListener("click", () => modal.close());
    modal.element.appendChild(closeButton);
    ```

    Call `open()` on a user action and focus stays trapped until `close()` runs.

    `lazyPortrait.js` enables IntersectionObserver-based image loading. The
    `renderJudokaCard` and `buildCardCarousel` helpers automatically call
    `setupLazyPortraits()` so portraits swap in when cards enter view. Import and
    call it manually only if you build card markup yourself.

  - `pages/`
    HTML pages. Each page imports a matching module from
    `src/helpers` (for example `randomJudokaPage.js`) that wires up its
    interactive behavior. The directory also contains
    `mockupViewer.html`, a simple carousel for browsing the image files
    under `design/mockups/`. It displays the filename overlay and now
    scales wide images to fit within the viewport while keeping every
    mockup centered on screen. The Prev and Next buttons are anchored
    to the left and right edges so they never cover the content.
  - `data/`
  - `schemas/`
    JSON Schema definitions used to validate the data files.
  - `assets/`
    Card art and UI graphics, including `cardBacks/cardBack-2.png` used when a card flips.
  - `styles/`

- `tests/` – Vitest unit tests.
- `playwright/` – end‑to‑end tests powered by Playwright. The `commonSetup` fixture mocks network requests with local fixtures for deterministic runs.
  - `design/` – documentation and code standards.
  - [Architecture Overview](design/architecture.md) – summary of key modules.

### PRD Reader

Product Requirements Documents live in `design/productRequirementsDocuments`.
Add new Markdown files there and include the filename in the `FILES` array of
`src/helpers/prdReaderPage.js`. Open `src/pages/prdViewer.html` in your browser
to browse the documents with next/previous navigation. Buttons tagged with
`data-nav="prev"` and `data-nav="next"` appear in both the header and footer.
The page now imports `base.css` and `layout.css` so wide elements stay wrapped
inside the viewport. Navigation buttons remain left-aligned with a gap so they
don't interfere with the centered content, and the body adds bottom padding so
the footer buttons clear the persistent navigation bar. Users can return to the
 main menu via the Home button.

### CSS Organization

- `base.css` – tokens, resets, and global typography.
- `layout.css` – overall page layout/grid.
- `components.css` – collection of `@import` rules that pull in
  reusable UI sub-files like `buttons.css`, `card.css`, `navbar.css`,
  `modal.css`, and `settings.css`. All `<button>` elements use design
  tokens such as `--button-bg`, `--button-text-color`,
  `--color-slider-dot`, and `--color-slider-active`. The helper
  `setupButtonEffects()` adds a Material-style ripple when buttons are
  clicked. An optional `.secondary-button` class provides a lighter
  variant.
- `utilities.css` – helper classes.
- Page-specific files such as `carousel.css` and `quote.css`.

Import styles in this order: `base.css` first, then layout and component files, and finally `utilities.css`.

Global rules should not be repeated across files.

All pages include a fixed header and persistent bottom navigation bar. The body
has top and bottom padding to ensure content scrolls under these elements.
Each header uses two `.header-spacer` elements flanking the logo so it stays
centered in the layout grid.

The `.animate-card` class in `buttons.css` (imported via `components.css`)
reveals new cards with a short fade and upward slide. A
`prefers-reduced-motion` media query removes the animation so the card appears
instantly when motion reduction is requested.

## Data Schemas and Validation

JSON files in `src/data` are validated against matching schemas in `src/schemas`.
Validate all data files at once with the npm script (which runs `scripts/validateData.js`):

```bash
npm run validate:data
```

You can also validate a single pair manually:

```bash
npx ajv validate -s src/schemas/judoka.schema.json -d src/data/judoka.json
```

See [design/dataSchemas/README.md](design/dataSchemas/README.md) for full details
and instructions on updating schemas when data changes.

## Tooltip Helper

Add lightweight help text anywhere by tagging elements with
`data-tooltip-id`. Tooltip text lives in `src/data/tooltips.json`.
Each page's initialization script must call `initTooltips()` once the DOM
is ready so hover and focus listeners are attached.

```html
<button data-tooltip-id="draw-button">Draw</button>
<script type="module">
  import { onDomReady } from "../helpers/domReady.js";
  import { initTooltips } from "../helpers/tooltip.js";
  onDomReady(() => initTooltips());
</script>
```

The repository specifies commenting standards in design/codeStandards. JSDoc comments and @pseudocode blocks must remain intact. When adding or modifying functions, include a matching @pseudocode section describing the logic.

## Features

JU-DO-KON! offers a 99-card deck and one-on-one stat battles in a fully browser-based format. The UI supports accessible components, modular JavaScript helpers, and a country picker for filtering cards. See the Product Requirements Documents in `design/productRequirementsDocuments` for details.

### Vector Search (RAG)

The project ships with a retrieval-augmented search demo. Run `npm run generate:embeddings` to create the index, then open `src/pages/vectorSearch.html` to try it out. Serve the repository with `npm start` or another local server so the page can fetch markdown files; opening it directly via file protocol will prevent additional context from loading. The generation script at `scripts/generateEmbeddings.js` downloads the quantized `Xenova/all-MiniLM-L6-v2` model the first time it runs—so make sure you have internet access or the download will fail. It allocates an 8 GB heap by default (`--max-old-space-size=8192`); adjust this value if Node still runs out of memory. These embeddings let AI agents query the product requirement docs, tooltip descriptions, and game data. The generated `src/data/client_embeddings.json` is pretty-printed for readability and must be committed for the page to work. Each entry may include a `qaContext` field—a short summary for tooltips or quick answers. Each embedding also includes an intent tag (`what`, `how`, or `why`) in its `tags` array, and agents and the search UI can filter results using these tags. If the generator does not detect any keywords it defaults the intent tag to "what". The tag is optional—the script simply appends it and leaves existing tags as-is. **Embeddings must be flat numeric arrays like `[0.12, -0.04, ...]`—objects with `dims` or `data` keys will break the search page.**

Embeddings are generated for each PRD section or JSON record, which allows the search interface to return precise matches instead of entire files. Markdown files are chunked from one heading to the next so each section maintains its context.

After modifying any PRDs, **any file in `src/data/`**, or docs under
`design/codeStandards` or `design/agentWorkflows`, run
`npm run generate:embeddings` again to rebuild `client_embeddings.json`. Commit
the updated file alongside your documentation changes so other agents have the
latest vectors.

The generator skips the large `aesopsFables.json` quote dataset to keep the
output file under the 3.6MB limit defined in the PRD.

If the output would exceed that limit, `scripts/generateEmbeddings.js` aborts
with `"Output exceeds 3.6MB"`. Increase the `CHUNK_SIZE` constant or exclude
large files to reduce the result size before rerunning the script.

If generation still fails because of memory limits, rerun the script with a
higher value, for example
`node --max-old-space-size=16384 scripts/generateEmbeddings.js`.

- Both the generation script and the search page use **mean pooled** embeddings so the query vector matches the stored vectors.

- Results appear below the form with up to five entries that show match score, source, and tags. Each entry also displays a short `qaContext` snippet when available.
- Search results are displayed in a responsive table with alternating row colors for readability.
- The Match column takes up more space than Source, Tags, and Score so the text is easier to read.
- The Tags column lists the categories provided in `client_embeddings.json`.
- The Source column wraps file paths at `/` characters so long locations stack vertically.
- Embeddings load when the page initializes so the first search doesn't wait for network fetches.
- Scores of **0.6** or higher are treated as strong matches in the UI; weaker results are hidden unless no strong match is found.
- Tag filters can be passed to limit results (e.g. only `judoka-data` entries or a specific intent like `how`).
- Each result includes an `id` so agents can fetch more text via `fetchContextById`.
- The page displays “Embeddings could not be loaded – please check console.” if loading fails, or “No close matches found” when nothing is returned.
- Users can submit the form by pressing **Enter** in the search box.
- The search page provides a tag filter dropdown so you can limit results to PRDs, tooltips, character data, or a particular intent tag.
- Agent scripts can import `findMatches` from `src/helpers/vectorSearch.js` to query embeddings programmatically.
- The transformer library is loaded from jsDelivr on first use, so network connectivity is required for that initial download.

## About JU-DO-KON!

**JU-DO-KON!** is a fast-paced, web-based card game, featuring real-life elite judoka. Designed for ages 8–12, the game uses simplified stats, vibrant collectible cards, and a player-vs-computer battle format. First to win 10 rounds takes the match!

This project is built with HTML, CSS, and JavaScript, and hosted on GitHub Pages.

🥋 99-card deck  
💥 One-on-one stat battles  
🔥 Built for kids and judo fans alike

---

## 🎮 How to Play JUDOKON!

See [prdClassicBattle.md](design/productRequirementsDocuments/prdClassicBattle.md) for a step‑by‑step overview of match flow and scoring.

## Live Demo

Try the game live in your browser: [JU-DO-KON!](https://cyanautomation.github.io/judokon/)

- No installation required.
- Fully playable with all features.

## Technologies Used

- **HTML5**: For the structure of the game.
- **CSS3**: For styling and layout.
- **JavaScript (ES6)**: For game logic and interactivity.
- **Vite**: For building and bundling the project.
- **Marked**: Minimal parser used in the PRD reader that now supports nested ordered and unordered lists, bold text, tables, and horizontal rules rendered as `<br/><hr/><br/>` for extra spacing.
- **GitHub Pages**: For hosting the live demo.

## Known Issues

- The game currently does not support mobile devices.
- Animations for card flips are now implemented.
- Difficulty levels for the computer opponent are under development.

## Display Modes

Light, dark and gray themes are supported. See [prdSettingsMenu.md](design/productRequirementsDocuments/prdSettingsMenu.md) for how the Display Mode switch applies these themes and related accessibility checks. If you modify colors, run `npm run check:contrast` while the development server is running.

## Settings & Feature Flags

The Settings page (`src/pages/settings.html`) groups all player preferences, including experimental **feature flags**. Toggle a flag to enable an optional feature without modifying code. Flag values persist across pages and apply immediately. Implementation guidelines live in [settingsPageDesignGuidelines.md](design/codeStandards/settingsPageDesignGuidelines.md#feature-flags--agent-observability).

Battle pages include a collapsible debug panel. Enable the **Battle Debug Panel** feature flag in **Settings** to reveal real-time match state in a `<pre>` element. The panel is keyboard accessible and hidden by default so normal gameplay remains unaffected.
Toggle the **Full Navigation Map** flag to display a map overlay with links to all pages for easier orientation during testing.
Enable the **Test Mode** flag for deterministic card draws and stat results. A "Test Mode Active" banner appears on battle pages.
Enable the **Card Inspector** flag to add a collapsible panel on each card containing its raw JSON. Opening the panel sets `data-inspector="true"` on the card for automated checks.

Game mode data now falls back to a bundled JSON import if the network request fails, so navigation works offline.
Corrupted settings are detected and automatically reset to defaults, ensuring the Settings page always remains usable.
Use the **Restore Defaults** button in the Links section to reset all settings. A confirmation dialog now appears before applying the defaults.

## Browser Compatibility

JU-DO-KON! is tested in the latest versions of Chrome, Firefox, Safari, and Edge.
The card carousel uses modern CSS like `clamp()` for flexible sizing. Safari 15
and older do not support `clamp()`, so cards fall back to a fixed `260px` width.
Safari may expand flex items if `min-width` isn't explicitly set. Set
`min-width: 0` on `.card-carousel` so horizontal scrolling works correctly.

- Safari ≤15 doesn't treat `aspect-ratio` as a definite height. `.judoka-card` now sets `height: calc(var(--card-width) * 1.5)` with `.card-top-bar` using `calc(var(--card-width) * 0.14)` so the header height remains consistent.
  Safari 18 has a regression where flex items grow when scroll buttons are inline
  with the carousel. Apply `min-width: 0` to `.carousel-container` and position
  `.scroll-button` absolutely to keep the carousel inside the viewport.
  Another Safari quirk allows the placeholder `#carousel-container` element to
  expand based on its children, producing a page wider than the viewport. Assign
  `width: 100%`, `min-width: 0`, and `overflow: hidden` to `#carousel-container`
  to constrain the carousel on this browser.
  Mobile Safari supports smooth scrolling via
  `-webkit-overflow-scrolling: touch`.
  Safari may expand grid columns when the container width is undefined.
  Setting `width: 100%` on both `.kodokan-grid` and `.kodokan-screen`
  keeps the carousel from stretching beyond the viewport.
  Safari counts scrollbars in the `vw` unit, which can lead to unexpected layout behavior. For example, a wrapper with `min-width: 100vw` may become wider than the page and cause horizontal scrolling. To prevent this, set `width: 100%` on the body and navbars. Optionally, use `overflow-x: hidden` to ensure the layout stays within the viewport.
  Mobile Safari 18.5 may also add vertical scroll if fixed headers and footers use `vh` units. The navbar height CSS variables now use `dvh` to match the dynamic viewport height and avoid extra scrolling. Pages with fixed headers or footers should set container heights to `calc(100dvh - var(--header-height) - var(--footer-height))` (or equivalent) so content isn't hidden when the viewport shrinks. The `.home-screen` container implements this rule.
  Pages now declare a `100svh` fallback before the `dvh` rule. This keeps the Random Judoka draw controls fully visible above the bottom navigation bar on iPad Safari.

Safari 18.5 positions `.signature-move-container` text at the bottom edge unless the container uses standard flex alignment. The container now applies `line-height: max(10%, var(--touch-target-size))` along with `align-items: center` and `justify-content: center`. Setting `width: 100%` on the child spans prevents stretching so the label and value remain vertically centered.

Safari 18.5 sometimes shrinks judoka cards, causing text overlap. The width rule now uses `clamp(200px, 60vw, 260px)` so cards occupy about 60% of the viewport on mobile. This applies to both the random card view and the browse carousel.
Safari 18.5 may keep a stat button highlighted between rounds. The rule `#stat-buttons button { -webkit-tap-highlight-color: transparent; }` works with the reset logic to force a reflow and blur the element so the red overlay disappears.

- The carousel sets the `--card-width` CSS variable via JavaScript so each card maintains consistent sizing across browsers and devices.

Chrome may show a small gap below the stats panel when the combined height of
card sections is less than 100%. Ensure `.card-top-bar`, `.card-portrait`,
`.card-stats`, and `.signature-move-container` together fill the card height to
avoid this issue.

The card layout now uses CSS grid rows (`calc(var(--card-width) * 0.14)`,
`42%`, `38.67%`, `max(10%, var(--touch-target-size))`) so the stats panel and
signature move band stack directly against each other in Safari and Chrome.

The bottom navbar uses `env(safe-area-inset-bottom)` with a `constant()` fallback to add extra padding and height. This prevents it from overlapping the iOS home indicator and keeps content visible.

The index page sets `padding-bottom: calc(var(--space-large) + var(--footer-height) + env(safe-area-inset-bottom))` on `.game-mode-grid` so the last row of tiles stays clear of the navigation bar on tablets. The `.home-screen` fallback now subtracts the header and footer heights when using standard `vh` units.

Layout containers should include a `vh` fallback declared before the `dvh` rule so browsers without dynamic viewport support still size elements correctly. The settings screen previously had its first controls hidden behind the header; wrapping the page in this `.home-screen` container resolves the issue. The page now starts with an `<h1>` heading and two `<fieldset>` sections labeled **General Settings** and **Game Modes**. Legends within `.settings-form` are styled as `<h2>`, and the form now includes padding. The classic battle page also uses this wrapper so the judoka cards appear fully below the header.

## Changelog

See [prdChangeLog.md](design/productRequirementsDocuments/prdChangeLog.md) for requirements around the in-app change log that lists the twenty most recently updated judoka.


## Future Plans

- Get feedback on current cards and stat points
- Take submissions/suggestions on new card designs and stats
- Add stat comparison animations
- Implement difficulty levels for the computer opponent
- Expand the card deck with more judoka and stats

## Contributing

Please format your code with **Prettier**, lint it with **ESLint**, run **Vitest** and **Playwright** before submitting a pull request. For UI-related changes, also verify color contrast with `npm run check:contrast` (Pa11y) while the development server is running. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full checklist.
