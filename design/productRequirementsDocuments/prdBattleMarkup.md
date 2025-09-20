# Battle Markup PRD

## TL;DR

This PRD defines the canonical DOM/markup contracts used by Classic Battle and related tools (CLI, tests, debug panels). It lists stable IDs, data attributes, and the responsibilities of the markup to support automation and accessibility.

## Owner & Version

- Owner: @frontend-team (placeholder — update to an individual owner)
- Document version: 1.0.0 — changes to markup contracts MUST follow the Governance section below.

## Problem Statement / Why it matters

Playwright tests, CLI integrations, and automation depend on stable DOM hooks. Historically, ad-hoc changes to class names and IDs caused multiple test failures and brittle selectors. Treating markup as a product contract reduces breakage and speeds up safe refactors. This document defines the canonical mapping and the process to change it.

## Goals / Success Metrics

- Authoritative, machine-readable list of stable DOM hooks (IDs, data-attributes, roles) for all battle UI surfaces.
- Reduce test-breakage related to selector drift by 90% in the next quarter.
- All Playwright tests must reference selectors from the canonical mapping (directly or via helper utilities).
- Every markup change that affects a canonical selector must include: PRD update, automated test changes, and a 14-day deprecation window for removals.

## User Stories

- As a test author, I want a single source of truth for selectors so tests remain resilient to styling changes.
- As a developer, I want a documented process to change markup so I can perform safe refactors without surprising test owners.
- As an accessibility reviewer, I want roles/labels mapped to elements so automated accessibility checks are accurate.
- As an external CLI/automation consumer, I want stable hooks so my tooling doesn't break across releases.

## Prioritized Functional Requirements

### P1 — DOM Contracts Inventory

- Feature: Canonical mapping file (`design/dataSchemas/battleMarkup.json`) listing stable hooks: logicalName, selector, dataTestId, role, description, owner, stability, aliases.
- Description: A machine-readable list authoritative for tests/CLI. Changes to entries follow the Change Policy below.

Acceptance Criteria:

- The mapping file exists and contains at minimum entries for: `roundMessage`, `snackbarContainer`, `battleStateBadge`, `playerCard`, `statButton` (per-player), `statLabel`, `statValue`, `selectStatButton`, `autoSelectIndicator`, modal/dialog roots used during battle flows.
- Playwright tests use the mapping via helpers (or import) for at least one representative test in `playwright/`.

### P1 — Change Policy and Governance

- Feature: Documented policy for renaming/deprecating selectors (communication, deprecation window, test updates requirement).
- Description: Steps required to change any canonical selector.

Acceptance Criteria:

- Policy section exists in this PRD and lists required steps (announce, add alias, update tests, remove after deprecation window).
- Every PR that updates a canonical selector includes a checklist linking to this PRD and references affected tests.

### P1 — Accessibility Mapping

- Feature: ARIA role/label guidance for canonical elements and keyboard focus expectations.
- Description: Each canonical entry must include recommended role/aria-label and keyboard behaviors (e.g., stat buttons must be focusable and operable with Enter/Space).

Acceptance Criteria:

- Accessibility guidance is present for each P1 element and Playwright accessibility checks exist for at least the stat-selection flow.

### P2 — Data-test-id Naming Convention

- Feature: Define a stable naming convention for `data-testid`/`data-test-id` attributes and an example linter rule to prefer them over brittle class-name selectors.
- Description: Recommend `data-testid="area:element"` style and discourage using visual or CSS classes as test hooks.

Acceptance Criteria:

- A naming guideline exists and one example test or helper in `playwright/helpers` uses it.

### P2 — Selector Compatibility Aliases

- Feature: Support aliasing old selectors to new selectors during deprecation window (both selectors present) to avoid breaking consumers.
- Description: Mapping entries may include `aliases: []` to hold deprecated selectors that will be removed later.

Acceptance Criteria:

- Mapping entries can include `aliases`, and the Change Policy describes when aliases must be removed.

### P3 — Developer Ergonomics for Selectors

- Feature: Helper utilities for tests to resolve selectors by logical name (e.g., `selectors.roundMessage()` returns the current selector) and a small example helper in `playwright/helpers/selectors.js`.
- Description: Helpers reduce duplication and centralize future updates.

Acceptance Criteria:

- A minimal helper example is present in the repository or linked from this PRD and one test imports it.

## Acceptance Criteria (overall)

- Every P1 requirement has at least one automated test referencing the canonical mapping.
- New or changed canonical selectors must have accompanying PRD/CHANGE notes and an explicit owner.

## Non-Functional Requirements / Design Considerations

- Use semantic HTML where possible and provide ARIA attributes for interactive elements.
- Favor `data-testid` attributes for test hooks instead of CSS classes.
- Keep the DOM tree shallow for key interactive areas to improve test and accessibility traversal performance.
- Minimize number of distinct root IDs to simplify test setup and query performance.

## Accessibility Checklist

- All interactive elements expose a role or are native interactive elements (button, input, a).
- Keyboard users can operate the stat selection flow (Tab to stat, Enter or Space to select).
- Visible focus indicators exist for stat buttons and primary controls.
- ARIA labels exist for non-textual controls (icons, badges) and match the copy used by tests.

## Change Policy (detailed)

1. Propose change in a PR that updates `design/dataSchemas/battleMarkup.json` and this PRD if semantics change.
2. Add `aliases` for removed selectors and keep both selectors present for a minimum deprecation window (default: 14 days) unless security/bugfix requires immediate removal.
3. Update all Playwright tests (or add a migration diff) in the same PR or a follow-up PR referenced by the original.
4. Notify test owners and add an entry to `CHANGELOG.md` referencing the selector change.
5. After the deprecation window, remove aliases and finalize mapping.

## Governance & Versioning

- Mapping file follows semantic versioning for the contract (major.minor.patch). Breaking changes bump major and require a documented migration plan.
- Minor/patch changes may be applied with PRD update and automated test updates.

## Example canonical mapping (human-readable excerpt)

- `roundMessage`
  - selector: `#round-message`
  - data-test-id: `battle:round-message`
  - role: `status`
  - description: Message shown for round prompts and results.
  - owner: `frontend-team`
  - stability: `stable`

- `snackbarContainer`
  - selector: `#snackbar-container`
  - data-test-id: `ui:snackbar`
  - role: `status`
  - description: Global transient messages (hints, countdown).

See the machine-readable file `design/dataSchemas/battleMarkup.json` for the full list.

## Example Playwright usage (recommended pattern)

// pseudo-code example (test authors should import the selector helper)

```js
// tests/battle/select-stat.spec.js
import selectors from "../../playwright/helpers/selectors";

test("player can select a stat via keyboard", async ({ page }) => {
  await page.goto("/battle/classic");
  await page.focus(selectors.statButton(0));
  await page.keyboard.press("Enter");
  await expect(page.locator(selectors.roundMessage())).toHaveText(/selected/i);
});
```

## Dependencies and Open Questions

- Depends on: `playwright/helpers` (selector helpers), `design/dataSchemas/` as canonical artifacts, and test owner contact list.
- Open: final canonical attribute name (`data-testid` vs `data-test-id`) — recommend `data-testid` for consistency with Playwright conventions but allow repo-wide lint rule to enforce chosen form.

## Next steps

1. Populate `design/dataSchemas/battleMarkup.json` with full inventory (owner to fill missing entries).
2. Add a small selector helper under `playwright/helpers/selectors.js` that resolves logical names to selectors using the canonical mapping.
3. Update a sample Playwright test to use the helper and show the end-to-end workflow.

## Appendix: Classic Battle Markup (merged from `design/battleMarkup.md`)

Classic battle pages rely on specific element IDs so helper scripts can attach listeners and update the UI. The following IDs must be present for scripts to function.

### Required IDs

| ID                      | Purpose |
| ----------------------- | ------- |
| `round-message`         | Announces prompts and round outcomes. |
| `next-round-timer`      | Displays the inter-round countdown. |
| `round-counter`         | Shows current round number. |
| `score-display`         | Lists player and opponent scores. |
| `test-mode-banner`      | Indicates when test mode is active. |
| `debug-panel`           | Collapsible container for debugging info. |
| `debug-output`          | `<pre>` element inside the debug panel. |
| `battle-area`           | Wrapper containing player and opponent cards. |
| `player-card`           | Container for the player's card. |
| `opponent-card`         | Container for the opponent's card. |
| `stat-buttons`          | Group of stat selection buttons. |
| `round-result`          | Displays the result of the round. |
| `next-button`           | Advances to the next round when ready; also uses `data-role="next-round"`. Pressing it always skips the cooldown regardless of the `skipRoundCooldown` flag. |
| `stat-help`             | Opens stat selection help. |
| `quit-match-button`     | Triggers the quit match flow. |
| `battle-state-progress` | Optional list tracking match state transitions; pre-populates from the current state and remaps interrupts to core states. |

### Data attributes and test hooks

The `id="next-button"` control must also specify `data-role="next-round"` and `data-testid="next-button"` so scripts and tests can reliably target it. Other battle controls follow the same `data-testid` pattern: `id="stat-help"` pairs with `data-testid="stat-help"` and `id="quit-match-button"` with `data-testid="quit-match"`. These requirements are enforced in the DOM tests at `tests/pages/battlePages.dom.test.js`.

### Example Markup

```html
<div id="stat-buttons" role="group" aria-label="Select a stat to battle">
  <button data-stat="power"></button>
  <!-- additional stat buttons -->
</div>

<div class="action-buttons">
  <button id="next-button" data-role="next-round" class="battle-control-button" disabled>
    Next
  </button>
  <button id="stat-help" class="battle-control-button" aria-label="Stat selection help">?</button>
  <button id="quit-match-button" class="battle-control-button">Quit Match</button>
</div>
```

Acceptance notes for PRD tests:

- Ensure the canonical mapping JSON (`design/dataSchemas/battleMarkup.json`) includes entries for all Required IDs above and provides `data-testid` values.
- Add unit tests that validate the selector helper maps logical names to the canonical selectors.
- Add a DOM-level test to assert that the `next-button`, `stat-help`, and `quit-match-button` have matching `data-testid` attributes when rendered.
