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
8. [Changelog](#changelog)
9. [Future Plans](#future-plans)
10. [Contributing](#contributing)

## Quick Start

1. Make sure you have **Node 19+** and `npm` (or another package manager) installed.
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

Set `SKIP_SCREENSHOTS=true` to skip the screenshot suite if you only want to run
the other Playwright tests:

```bash
SKIP_SCREENSHOTS=true npm run test:screenshot
```

## Project Structure

The repository follows a simple layout. GitHub Pages requires `index.html` to live at the project root.

- `index.html` – landing page served by GitHub Pages.
- `src/` – contains the game logic and assets:
  - `game.js`
  - `helpers/`
  - `pages/`
  - `data/`
  - `schemas/`  
    JSON Schema definitions used to validate the data files.
  - `assets/`
  - `styles/`
- `tests/` – Vitest unit tests.
- `design/` – documentation and code standards.
- [Architecture Overview](design/architecture.md) – summary of key modules.

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

The repository specifies commenting standards in design/codeStandards. JSDoc comments and @pseudocode blocks must remain intact, as shown in documentation excerpts.

## Features

- 99-card deck featuring elite judoka (slowly building up to this)
- One-on-one stat battles
- Designed for kids and judo fans alike
- Playable directly in the browser
- Loading indicator for better user experience
- Modularized JavaScript for better maintainability
- Slide-in country picker for filtering judoka by flag

## About JU-DO-KON!

**JU-DO-KON!** is a fast-paced, web-based card game, featuring real-life elite judoka. Designed for ages 8–12, the game uses simplified stats, vibrant collectible cards, and a player-vs-computer battle format. First to win 10 rounds takes the match!

This project is built with HTML, CSS, and JavaScript, and hosted on GitHub Pages.

🥋 99-card deck  
💥 One-on-one stat battles  
🔥 Built for kids and judo fans alike

---

## 🎮 How to Play JUDOKON!

**JUDOKON!** is a fast-paced, Top Trumps-style card game featuring real-life elite judoka. You play against the computer in a battle of stats — first to 10 wins takes the match!

### 🥋 The Rules:

1. **You vs. Computer**

   - Each match starts with both players receiving **25 random cards** from a 99-card deck.

2. **Start the Battle**

   - In each round, you and the computer each draw your top card.

3. **Choose Your Stat**

   - You select one of the stats on your card (e.g. Power, Speed, Technique, etc.)

4. **Compare Stats**

   - The chosen stat is compared with the computer’s card.
   - **Highest value wins the round**.
   - If both stats are equal, it’s a **draw** — no one scores.

5. **Scoring**

   - Each round win gives you **1 point**.
   - The cards used in that round are **discarded** (not reused).

6. **Winning the Match**
   - First player to reach **10 points** wins!
   - If **neither player reaches 10 points after 25 rounds**, the match ends in a **draw**.

## Live Demo

Try the game live in your browser: [JU-DO-KON!](https://cyanautomation.github.io/judokon/)

- No installation required.
- Fully playable with all features.

## Technologies Used

- **HTML5**: For the structure of the game.
- **CSS3**: For styling and layout.
- **JavaScript (ES6)**: For game logic and interactivity.
- **Vite**: For building and bundling the project.
- **GitHub Pages**: For hosting the live demo.

## Known Issues

- The game currently does not support mobile devices.
- Animations for card flips are not yet implemented.
- Difficulty levels for the computer opponent are under development.

## Future Plans

- Get feedback on current cards and stat points
- Take submissions/suggestions on new card designs and stats
- Add animations for card flips and stat comparisons
- Implement difficulty levels for the computer opponent
- Expand the card deck with more judoka and stats

## Contributing

Please format your code with **Prettier**, lint it with **ESLint**, run **Vitest** and **Playwright** before submitting a pull request. For UI-related changes, also verify color contrast with `npm run check:contrast` (Pa11y) while the development server is running. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full checklist.
