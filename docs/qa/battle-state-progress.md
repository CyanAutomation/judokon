# Battle State Progress QA Guide

The `battleStateProgress` flag renders a persistent list of match states in Classic Battle so QA can monitor state-machine transitions. The list lives below the battle area and surfaces a rich set of data attributes for automation.

## Enablement Steps

1. Toggle **Battle State Progress** on in Settings → Advanced, or inject `window.__FF_OVERRIDES = { battleStateProgress: true }` before loading `battleClassic.html`.
2. Load `src/pages/battleClassic.html`.
3. Start a match via the modal (Quick/Medium buttons) so the state machine begins emitting events.

## Expected Markers

Once the feature is active, verify:

| Element | Selector | Attributes |
| --- | --- | --- |
| Wrapper | `[data-feature-battle-state-progress="wrapper"]` | Present at render time; remains visible. |
| List | `#battle-state-progress[data-feature-battle-state-progress="list"]` | `data-feature-battle-state-ready="true"` once the first state arrives.<br>`data-feature-battle-state-active` reflects the remapped active state.<br>`data-feature-battle-state-active-original` stores the raw state (useful for interrupts).<br>`data-feature-battle-state-count` matches the number of items. |
| Items | `#battle-state-progress li` | Each item carries `data-feature-battle-state-progress-item="true"`.<br>The active state adds `data-feature-battle-state-active="true"`. |

## Active State Assertions

The helper remaps transient states (`interruptRound`, `roundModification`, etc.) to their canonical counterparts. To confirm:

- With the flag on, wait for `data-feature-battle-state-active="waitingForPlayerAction"`.
- Trigger a state change (select a stat, complete a round).
- Ensure only one list item has `data-feature-battle-state-active="true"` at any moment.
- Confirm `data-feature-battle-state-active-original` retains the original state identifier for audit trails.

## Automation References

- Unit tests: `tests/helpers/battleStateProgress.test.js`
- Playwright coverage: `playwright/battle-classic/battle-state-progress.spec.js`

Mirror those checks if you build new probes or dashboards: they poll readiness, inspect `data-*` attributes, and verify state remapping.

## Troubleshooting

- **No list items:** Make sure you start a match; the list renders after the first `battleStateChange` event.
- **Missing attributes:** Verify the flag was enabled before page bootstrap; reload if you toggled it mid-session.
- **Interrupt states not remapped:** Inspect `data-feature-battle-state-active-original`; if it matches the raw interrupt value, remapping is still functioning (the active attribute shows the canonical target). If both match the interrupt, file a bug against `src/helpers/battleStateProgress.js`.
