JU‑DO‑KON Classic Battle CLI – QA Evaluation

Scope: Review `src/pages/battleCLI.html` for structure, accessibility, semantics, testability, and alignment with repository standards. Provide corrections, improvements, and an implementation plan.

Area Evidence & Assessment
Text‑first
renderer /
terminal look
The CLI page uses a monospace font, high contrast colours and ASCII
separators. The DOM shows sections such as #cli-header , #cli-
countdown , #cli-stats , #round-message and #cli-score to mirror
the PRD’s single‑column layout. Elements like the header and countdown are
presented without images or animations, meeting the “Text Renderer”
requirement.
Accessible
markup
The source includes aria-live="polite" and role="status" on
1
countdown, round message and header status elements , satisfying the
requirement that prompts, timers and outcomes are announced to screen
readers. Lists and settings use role="listbox" and labelled form controls.
The help and settings panels use aria-expanded and aria-controls ,
and ESC closes the quit confirmation dialog correctly (tested).
Match settings
& win target
selection
A settings panel allows selection of win target (5/10/15), verbose mode and
deterministic seed. Changing the win target triggers a confirmation dialog and
resets scores, as required for “Settings (Minimal)”. The win target persists in the
drop‑down after change.
Help &
shortcuts
Pressing H shows a help panel listing available shortcuts (1‑5 to select stat,
Enter/Space to advance, Q to quit, H to toggle help). Pressing H again or Esc
hides the panel, matching the keyboard specification.
Quit
confirmation
Pressing Q opens a modal (“Quit the match?”) with Cancel and Quit options;
Esc cancels the quit and returns to the match. This behaviour follows the
acceptance criteria for quit confirmation.
Win target &
settings
persisted
The settings panel uses localStorage to remember collapsed state and
retro theme; the initialisation script exposes helpers like
setSettingsCollapsed, setCountdown , etc., for deterministic tests. The
CLI reflects changes to the win target in the header after confirmation.
Countdown
timer
Starting a match displays a timer at the top left that counts down from 30 at
one‑second intervals. The timer uses text (“Timer: 30”) and automatically
decreases, satisfying the 1 Hz textual countdown requirement. When the user
opens a quit dialog, the timer pauses, then resumes once the dialog is closed,
meeting the edge‑case requirement for interruptions.
⚠ Issues found (repro steps)
1.
Stat list never loads
Steps: Navigate to Classic Battle CLI > Select match length (e.g., Quick) > choose win target
(default or 5) > click Start match. A 30‑second countdown begins, but the stat list area remains
empty (blue outline) and no stat rows appear. No keyboard input is possible because there are
no items to select. When the timer expires, the round doesn’t progress—no auto‑selection
occurs and the game is effectively stuck.
Impact: The core mechanic of selecting stats and playing rounds is impossible. This violates
engine parity and the acceptance criteria that the UI must reflect engine state transitions and
allow stat selection via digits.
2.
Keyboard cannot select match length
Steps: When the “Select Match Length” modal appears, pressing number keys (1–3), Enter or
arrow keys does nothing; only clicking with the mouse selects “Quick/Medium/Long.”
Impact: Breaks the “keyboard‑first” goal; users relying on keyboard cannot start the match.
3.
Quick/Medium/Long selection doesn’t update win target automatically
Steps: Choose “Quick” from the match length modal. The overlay closes and text appears (“Quick
– first to 5 points wins”), but the win target drop‑down still displays 10 points until manually
changed.
Impact: Mismatch between quick mode and win target; confuses players and may cause
unintended game length. It violates the PRD’s requirement that win target options (5/10/15)
correspond to match length.
4.
Scoreboard header overlaps text / misaligns
Observation: The top header shows “Round 0 Target: 5” but the text overlaps (characters from
“Target” overlay each other). This issue reduces readability and fails the visual hierarchy
specification.
5.
Stat selection cannot be cancelled/overwritten (not testable due to bug)
Observation: The PRD specifies that stat selections can be overwritten before timeout. Because
stats never load, this cannot be validated.
6.
Outcome & Score never display
Observation: Because rounds never resolve, there is no way to verify that win/loss/draw results
and score updates appear immediately.
7.
Accessibility omissions
Observation: Though aria‑live regions exist, the missing stat list prevents focus navigation and
screen‑reader announcements of available stats. The keyboard focus ring highlights the empty
area, but there is nothing to read. This fails the acceptance criteria that interactive elements
remain accessible at 200 % zoom and have correct names/roles.
8.
No indication of retro theme toggle
Observation: The PRD mentions an optional retro theme with better contrast and localStorage
persistence. The current UI uses a retro green‑on‑black palette by default with no visible toggle.
It’s unclear how to switch themes.
2
Improvement opportunities
1.
Fix stat‑loading race
Investigate why cli-stats remains empty after Start match . The JS initialisation uses
createBattleStore and startRound to populate stats. Ensure asynchronous loading of
stat names ( statNamesData ) and battle engine state triggers rendering. Add error handling to
display a message (“Loading stats…” or error) instead of leaving a blank area.
2.
Enable keyboard navigation for match‑length selection
The “Select Match Length” modal should accept hotkeys ( 1 , 2 , 3 ) and arrow/Enter keys.
Assign focus to the first option on open and allow Up/Down/Left/Right arrows to navigate.
Include instructions (“Use ↑/↓ or 1–3 to select”). This will satisfy the keyboard‑first goal.
3.
Synchronise match length and win target
Selecting Quick, Medium or Long should automatically set the win target (5, 10 or 15 points
respectively) and update both the drop‑down and header. Conversely, if the user changes the
drop‑down manually, update the match length descriptor. Provide clear confirmation text
(“Target set to 5 points”).
4.
Refine header layout
Use flexible CSS (e.g., CSS grid or flex) to separate “Round X of Y” and “Target: Z” into distinct
columns, preventing overlap and truncation. Ensure the header remains responsive and
accessible at 200 % zoom.
5.
Improve visual feedback and error messaging
When invalid keys are pressed, a message appears (“Invalid key, press H for help”). Provide this
message near the prompt area instead of at the top to reduce visual noise. For persistent errors
(e.g., engine failed to load), display a detailed error and suggest refreshing.
6.
Expose retro‑theme toggle
Add a toggle within Settings to switch between light and retro themes (e.g., Retro theme:
[ ] ). Persist the choice in localStorage and use the helper applyRetroTheme already
2
exposed by battleCLI.init.js.
7.
Enhance test hooks
Provide stable IDs ( #next-round-button , #cli-round , #cli-controls-hint ) and
ensure they remain unchanged across releases. Expose a deterministic mode where the timer
speed can be accelerated for automated tests.
8.
Accessibility improvements
9.
10.
11.
Add visually hidden labels to the match‑length buttons and quit dialog buttons for screen
readers.
Ensure focus order moves logically: after starting a match, focus should move to the first stat
row, not to the empty container.
When the timer expires and auto‑select occurs, announce which stat was chosen and why (e.g.,
“Timer expired, Speed selected automatically”).
3
🔍 PRD alignment notes
•
•
•
•
•
•
•
Engine parity & determinism: Unable to validate because rounds never start; stat list not
populated. Ensure reuse of the Classic Battle engine and seeded PRNG as mandated.
Keyboard controls: Partially implemented. Help (H) and Quit (Q) work; however selecting stats
(1–5) and advancing rounds with Enter/Space cannot be tested due to missing stats. Keyboard
support for match‑length selection is absent.
Pointer/touch targets: The settings drop‑down and “Start match” button are clickable and
appear ≥44 px high, satisfying touch‑target sizing. However stat rows cannot be verified.
Timer display: The 1 Hz countdown functions and pauses during quit confirmation.
Outcome & score: Not observable; the PRD requires immediate display of Win/Loss/Draw and
score updates.
• 1
Accessibility hooks: aria-live and proper roles are present in the DOM , but missing stat
rows prevent full compliance.
Test hooks and helpers: Exposed in window.__battleCLIinit as per PRD; functions like
setCountdown , renderSkeletonStats , etc., exist. These enable deterministic tests once
stat loading works.
Settings & observability: Win‑target selection with confirmation works; verbose log panel exists
(hidden by default) but cannot be tested without game events..
Overall impression
The Classic Battle CLI interface strongly aligns with the visual and accessibility guidelines of the PRD,
offering a clear monospace design, visible focus rings and accessible markup. Nevertheless, the current
implementation contains critical functional bugs that prevent any rounds from running. Resolving the
stat‑loading issue and completing keyboard interactions are essential before this mode can deliver on
its goals of engine parity, deterministic behaviour and efficient keyboard‑first play.


Summary
- The file is generally well‑structured and test‑friendly, with thoughtful ARIA usage, skip link, and clear DOM anchors for the battle flow and snackbar.
- Key risks: overuse of live regions, role mismatches (listbox/options and textbox), duplicated/conflicting CSS for `.cli-stat`, a large `min-height` on `.state-badge` that can bloat the header, and default theme classes that may fight feature flags.
- No dynamic imports here; scripts are static modules. Test hooks (`data-test`, stable IDs) are present.

Accuracy Check of Submitted Audit
- Note: `progress.md` only contained a placeholder (“TBC”), so there was nothing substantive to validate. This document provides a fresh, source‑based audit of `src/pages/battleCLI.html` for your review.

Findings
1) Accessibility and semantics
- Live regions: Multiple elements are `aria-live="polite"` (`#round-message`, `#cli-countdown`, `.cli-status` children, and hidden scoreboard nodes). This risks duplicate announcements. Recommendation: keep `#round-message` as the primary live region; set the rest to `aria-live="off"` or remove `aria-live` unless required.
- Prompt: `#cli-prompt` uses `role="textbox"` but is neither focusable nor an input. If it is only a non‑interactive terminal prompt line, change to a non‑interactive role (e.g., remove role or use `role="status"`) and add `aria-live="off"` to avoid redundant announcements.
- Listbox semantics: `#cli-stats` has `role="listbox"`, but its children (skeleton rows) are plain `div`s. Screen readers expect `role="option"` children. Recommendation: while skeletons are shown, either: (a) do not set `role=listbox` yet and set `aria-busy="true"`; or (b) mark skeletons `role="presentation"`. When actual options render, ensure each has `role="option"`, `aria-selected`, and proper labeling.
- Help panel toggle: The close button uses `aria-expanded="false"` and `aria-controls="cli-shortcuts-body"`, but this state is not toggled in markup. Ensure the JS click handler syncs `aria-expanded` with `hidden` on the panel body.
- Decorative CSS content: Several `::before` icons (e.g., in `#cli-countdown`, `#round-message`, scoreboard nodes). Some AT may announce generated content. Safer pattern: include meaningful labels in the element text or via `aria-label` and treat icons as decorative using markup rather than CSS content when possible.
- Seed input: Good use of `type="number"` and `inputmode`. Add `aria-describedby="seed-error"` so the error is associated, and consider `min`, `max`, and `step` constraints if appropriate.
- Terminal title bar: Consider `aria-hidden="true"` if purely decorative.

2) Visual/CSS issues
- Duplicate `.cli-stat` declarations: Defined twice with different padding and properties (early and later in the stylesheet), increasing cognitive load and risk of drift. Recommendation: consolidate into a single `.cli-stat` rule block.
- `.state-badge` has `min-height: 8rem` with a comment about reserving space for stat rows. This appears to be a misapplied rule; it will balloon header height if shown. Recommendation: remove that `min-height` from `.state-badge` (space is already reserved by `#cli-stats`).
- Unused CSS: Styles for `#start-match-button` are present, but no such element exists in the markup. Recommendation: remove or add the button; otherwise delete the dead CSS.
- Inline styles: Several inline style attributes (e.g., settings headers) are present. Recommendation: move these to CSS classes for consistency and easier maintenance/testing.

3) Theming/flags
- Body has `class="cli-retro cli-immersive"` by default, and the head script also toggles classes based on `userFlags`. This can create conflicts or make flags ineffective. Recommendation: remove the hard‑coded body classes and rely on flags (or set a single deliberate default and let flags override it deterministically).

4) Testability
- Good: stable IDs (`#cli-root`, `#cli-stats`, `#round-message`, `#snackbar-container`), `data-test` hooks, skeleton placeholders to stabilize layout, and hidden scoreboard nodes for future integration.
- Improve: when applying role changes (listbox/options), ensure tests assert via roles/names as well as IDs where relevant to improve resilience.

5) Standards alignment
- No dynamic imports in this page; scripts are static module tags.
- No unsilenced console in this file.
- Contrast appears strong across key elements, but a contrast run is advised after any color changes.

Concrete Recommendations
- Live regions: Keep `#round-message` as the primary `aria-live="polite"`. Remove or set others to `aria-live="off"` unless strictly needed.
- Prompt: Replace `role="textbox"` on `#cli-prompt` with a non‑interactive role (or none) and, if kept as an informational row, add `aria-live="off"`.
- Stats semantics: While skeletons are present, add `aria-busy="true"` on `#cli-stats` and mark skeletons `role="presentation"`. When real options render, ensure each option has `role="option"` and `aria-selected` state management.
- CSS cleanup: Remove duplicate `.cli-stat` block and unused `#start-match-button` styles. Remove `min-height: 8rem` from `.state-badge`.
- Theming: Remove default `cli-retro/cli-immersive` classes from `<body>` and rely on the feature flag initialization, or gate the default via a single source of truth (e.g., settingsDefaults).
- Seed input: Add `aria-describedby="seed-error"` and consider min/max/step.
- Decorative icons: Prefer markup‑based icons or ensure text labels convey meaning without relying on CSS `content`.
- Inline → CSS: Extract inline styles in settings/headers to CSS classes.

Proposed Implementation Plan
1) Accessibility pass
- Consolidate live regions; adjust roles for prompt and stats.
- Add `aria-busy` and `role="presentation"` for skeletons; ensure real options use `role="option"` with `aria-selected`.
- Wire the help panel toggle to update `aria-expanded` in sync with `hidden`.

2) CSS refactor
- Merge `.cli-stat` definitions; remove dead `#start-match-button`; remove `min-height` from `.state-badge`.
- Extract inline styles into CSS classes within `cli-immersive.css`/`components.css`.

3) Theming/flags
- Remove hard‑coded `cli-retro cli-immersive` on `<body>`; rely on `userFlags` or a single controlled default.

4) Inputs and labels
- Add `aria-describedby` for the seed input and consider numeric constraints.

5) Validation
- Run: `npm run check:contrast`, `npx prettier . --check`, `npx eslint .`, `npx vitest run`, `npx playwright test`.
- Agent‑specific checks: ensure no dynamic imports in hot paths and no unsilenced console in tests.

Notes/Assumptions
- This audit focuses on `src/pages/battleCLI.html` only; JavaScript handlers (e.g., role toggling, option rendering) are assumed to exist in `battleCLI.js`/`battleCLI.init.js`. If they don’t yet enforce the ARIA state changes described, we’ll add those in a follow‑up PR.
- If you intended a different file for the audit text, let me know and I’ll reconcile it; for now, this document supersedes the placeholder.

Next Step (awaiting your review)
- Confirm the recommendations you want implemented. I can then submit a focused patch adjusting roles/live regions, consolidating CSS, and removing unused code, followed by a quick validation run.
