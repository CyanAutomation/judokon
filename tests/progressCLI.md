## CLI Progress & Improvement Plan

Purpose
-------
This document captures the results of a Playwright-based evaluation of `src/pages/battleCLI.html` and provides a prioritized, actionable plan an AI agent can follow to make the page more convincingly resemble a legacy terminal/CLI.

Summary of findings
-------------------
- The page already uses a monospace font, dark background, and has a dedicated retro theme (`body.cli-retro` / `data-theme="retro"`).
- Visual styling currently leans toward modern card-like UI (rounded `.cli-block`, borders, padding). This reduces immersion.
- Accessibility is strong: live regions are present for round messages and logs; form controls have labels; keyboard hints and focus outlines are implemented.
- Contrast ratios for main text and stat rows are excellent.

Goals
-----
- Provide an "immersive terminal" styling mode for `battleCLI.html` that:
  - removes site chrome and card-like visuals,
  - presents content as single-column terminal output,
  - optionally applies retro phosphor green-on-black styling,
  - preserves or improves accessibility.

Prioritized opportunities (with complexity score)
------------------------------------------------
1) Make an immersive terminal — Complexity: 3/5
	- Make CLI area full-bleed, remove outer rounded containers.
	- Why: immediate high-impact immersion improvement.

2) Promote/enable retro green-on-black theme by default or add a prominent toggle — Complexity: 1/5
	- Set `body.cli-retro` by default for this route or add a UI toggle that persists via localStorage. There is a Display Settings option of "retro" - there should be a toggle option on src/pages/battleCLI.html to enable retro mode, and this should apply the global setting, rather that just a setting on this page.
	- Why: low effort, high character return.

3) Replace card-like stat rows with plain terminal lines (square edges, less padding) — Complexity: 2/5
	- Remove border-radius, reduce padding, use block-level lines and ASCII separators.

4) Add a blinking cursor and prompt area (authenticity) — Complexity: 2/5
	- Add a prompt element with an accessible role and a CSS blink animation (respecting prefers-reduced-motion).

5) Add optional scanline or phosphor glow overlay (visual effect, opt-in) — Complexity: 3/5
	- Implement as an opt-in CSS overlay or small canvas layer; provide toggle in settings.html to disable for accessibility.

6) Swap site chrome for a minimal terminal title bar / window chrome (optional) — Complexity: 3/5
	- Add a small title bar (textual or iconographic) that reads like "bash — JU-DO-KON"

7) Improve typography to match terminal aesthetics (font, line-height) — Complexity: 2/5
	- Consider a specialized mono webfont and tighter line-height; keep fallbacks.

Implementation Plan (sequential tasks for an AI agent)
---------------------------------------------------
Step 0 — Safety & prep
- Confirm current `battleCLI.html` markup and CSS selectors (header: `#cli-header`, main: `#cli-main`, blocks: `.cli-block`, stats: `.cli-stat`).
- Add tests/visual checkpoints: ensure `scripts/evaluateBattleCLI.mjs` exists and runs (already present).

Step 1 — Toggle & defaults for retro/immersive mode (small, non-destructive)
- Reuse `cli-retro` for:
  - sets `body` background to `#000`, color to the retro green, and forces `.cli-block` backgrounds to transparent/black.
  - removes border-radius and reduces paddings.
- Modify `battleCLI.html` to include `class="cli-retro cli-immersive"` on `body` OR insert a small inline script that reads localStorage `cliMode` and applies classes.
- This is linked to the "retro" toggle in settings.html.

Step 3 — Update `.cli-block` and `.cli-stat` styles for terminal lines
- In `.cli-immersive` or global retro rules:
  - `.cli-block { border-radius: 0; background: #000; border: none; padding: 6px 0; }`
  - `.cli-stat { background: transparent; border: none; padding: 2px 0; display: block; }`
  - Use ASCII separators `.ascii-sep` as visible dividers.

Step 4 — Add prompt + blinking cursor
- Append a prompt element into `#cli-main` (e.g., `<div id="cli-prompt" role="textbox" aria-label="Command prompt">&gt; <span id="cli-cursor" aria-hidden="true">▌</span></div>`).
- CSS for blink (respect `prefers-reduced-motion`):
  - `@keyframes blink { ... } #cli-cursor { animation: blink 1s steps(2,end) infinite; }`
- Ensure the prompt is keyboard focusable and screen-reader-friendly (manage `aria-live` if needed).

Step 5 — Add optional scanline / glow overlay (opt-in)
- Add a toggle in settings.html to enable scanlines; implement an absolutely-positioned pseudo-element or canvas overlay with pointer-events: none and low-opacity stripes.

Step 6 — Polish: terminal title bar, font tweak, and tests
- Add a thin textual title bar (optional) and experiment with terminal webfonts.

Testing & validation
--------------------
- Smoke: run `node scripts/evaluateBattleCLI.mjs` before and after changes and compare screenshots.
- Accessibility: re-run the Playwright accessibility snapshot; validate live region roles remain and that any removed visual chrome is still accessible to screen readers.
- Keyboard: ensure [1–5], [H], [Q], Enter/Space still function (functional tests can live in `playwright/` or `tests/`).

Notes about edge cases & accessibility
-------------------------------------
- Blinking cursor and scanlines must respect `prefers-reduced-motion`.
- Keep the Home link reachable at all times to avoid losing navigation.
- Color choices should keep contrast > 4.5:1 for main text; current colors are already strong.

Agent instructions / acceptance criteria
---------------------------------------
For each task the AI agent performs:
- Create a small, focused commit. Keep changes scoped to `src/pages/battleCLI.*` and a test/script under `scripts/`.
- Add one visual regression screenshot pair (before/after) saved under `scripts/eval-results/`.
- Run `node scripts/evaluateBattleCLI.mjs` to produce style and accessibility snapshots and attach them to the commit or PR.
- Ensure vitest/playwright tests still pass (or add a small Playwright spec under `playwright/` that validates keyboard hints and prompt presence).

Appendix: artifacts created during initial evaluation
----------------------------------------------------
- `scripts/evaluateBattleCLI.mjs` — Playwright script used to capture screenshots and snapshots.
- `scripts/eval-results/` — contains `battleCLI-full.png`, `battleCLI-header.png`, `battleCLI-main.png`, `accessibility.json`, `style-summary.json`, `dom-snapshot.json`.


