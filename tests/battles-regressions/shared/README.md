# Shared Component Tests

Tests for components used by both battleClassic.html and battleCLI.html.

## Structure

- **scoreboard/** - Scoreboard component tests (used by both modes)
- **modal/** - Modal dialog component tests
- **configuration/** - Battle configuration and defaults

## What Gets Tested

### Scoreboard Tests

- Scoreboard rendering and display
- Score updates and synchronization
- Player info display
- Round number display
- Win condition detection
- Scoreboard model and view separation
- Data binding and reactivity
- Accessibility features

### Modal Tests

- Modal dialog opening/closing
- Button click handling
- Form submission
- Modal accessibility
- Focus trapping
- Keyboard escape key handling
- Overlay interaction

### Configuration Tests

- Battle defaults loading
- Configuration validation
- Default values and overrides
- Settings persistence
- Feature flag defaults

## Running Shared Component Tests

```bash
# All shared component tests
npm run test:battles:shared

# Watch mode
npm run test:battles:watch

# Specific test
npx vitest run tests/battles-regressions/shared/scoreboard/scoreboard.test.js

# With coverage
npm run test:battles:cov
```

## Test Requirements

See [AGENTS.md - Battle Pages Regression Testing](../../../AGENTS.md#-battle-pages-regression-testing) for:
- Test quality standards
- Fake timer usage
- Console discipline
- Accessibility testing patterns

## Component Locations

- Scoreboard: `src/components/Scoreboard.js`
- Modal: `src/components/Modal.js`
- Configuration: `src/config/settingsDefaults.js`
