# CLI Battle Tests

Tests for `src/pages/battleCLI.html` organized by feature and responsibility.

## Structure

- **keybindings/** - Keyboard shortcuts, hotkey handling, input processing
- **display/** - Terminal rendering, verbose mode, scoreboard formatting
- **compatibility/** - Seeds, points-to-win configuration, feature compatibility
- **accessibility/** - Focus management, live regions, contrast compliance

## What Gets Tested

### Keybindings Tests

- Keyboard shortcut handling
- Hotkey registration and execution
- Number input and validation
- Navigation between modes
- Modifier key combinations

### Display Tests

- Terminal rendering and formatting
- Verbose mode toggling and display
- Scoreboard text rendering
- Round header formatting
- Player info display in terminal
- Dualwrite mode compatibility

### Compatibility Tests

- Seed validation and seeding logic
- Points-to-win configuration
- Start-once flag behavior
- Retrograde theme compatibility
- CLI-specific feature support
- Fallback rendering

### Accessibility Tests

- Focus management during gameplay
- Live region announcements
- Contrast compliance (WCAG)
- Screen reader compatibility
- Keyboard-only navigation

## Running CLI Battle Tests

```bash
# All CLI battle tests
npm run test:battles:cli

# Watch mode
npm run test:battles:watch

# Specific test
npx vitest run tests/battles-regressions/cli/keybindings/shortcuts.test.js

# With coverage
npm run test:battles:cov
```

## Test Requirements

See [AGENTS.md - Battle Pages Regression Testing](../../../AGENTS.md#-battle-pages-regression-testing) for:
- Test quality standards
- Fake timer usage
- Console discipline
- Accessibility testing patterns

## Related Files

- Source: `src/pages/battleCLI.html`
- Main logic: `src/helpers/battle.js`
- E2E tests: `playwright/battle-cli*.spec.js`
