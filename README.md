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

JU-DO-KON! is a strategic digital card game inspired by Top Trumps, featuring judo athletes from around the world. Each card is assigned attributes like **Power**, **Technique**, **Spirit**, and more—allowing players to battle judoka in quick, decisive rounds. The game is built using modern **HTML/CSS/JavaScript** and hosted via GitHub Pages.

---

## 🚧 Development Status

The game is currently in active development. New features are being rolled out behind feature flags, with ongoing testing, design refinement, and gameplay enhancements.

---

## 👩‍💻 Contributing

Whether you're a developer, designer, tester, writer—or an AI agent—we welcome contributions to JU-DO-KON!

For full contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

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
- `/data/tooltips.json` – Tooltip content (auditable by agents)
- `/data/judoka.json` – Card data for stat logic
- `/components/` – Frontend logic with `data-*` hooks for observability

### 🧪 Common Tasks

- ✅ Check for missing tooltips on interactive elements
- ✅ Validate stat blocks against rarity rules
- ✅ Generate or evaluate PRDs for new features

## Settings API

Settings are loaded once and cached for synchronous use. Helpers in
`src/helpers/settingsUtils.js` provide safe access:

- `getSetting(key)` – read a setting value from the cache.

Feature flags are managed through `src/helpers/featureFlags.js`:

- `isEnabled(flag)` – synchronous check for a flag's enabled state.
- `setFlag(flag, value)` – persist a flag change and emit an update.
- `featureFlagsEmitter` – listen for `change` events when flags toggle.

Call `loadSettings()` during startup to populate the cache before using
these helpers. Pages should rely on `featureFlags.isEnabled` rather than
accessing `settings.featureFlags` directly.

## Vector Search Helpers

Utilities for working with the embedding database are centralized in
`src/helpers/vectorSearch/index.js`. The default export provides methods to
load embeddings, expand queries, find matches, and fetch surrounding
context:

```javascript
import vectorSearch from "./src/helpers/vectorSearch/index.js";
const embeddings = await vectorSearch.loadEmbeddings();
const expanded = await vectorSearch.expandQueryWithSynonyms("grip fighting");
const results = await vectorSearch.findMatches([0, 1, 0], 5, ["prd"], expanded);
```

## 🧪 Testing

The game includes a **Skip** button that bypasses the current round and cooldown timers. Use it to fast-forward through matches when debugging or running rapid gameplay tests.

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


