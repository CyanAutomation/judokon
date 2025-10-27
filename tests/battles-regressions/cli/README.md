# CLI Battle Tests - Regression Testing Guide

This directory contains CLI battle mode regression tests, organized by feature category for focused testing and maintenance.

## Test Organization

- **display/** - Output rendering, themes, display modes (29 tests)
- **keybindings/** - Keyboard shortcuts and hotkeys (1 test)
- **accessibility/** - A11y, focus management, contrast (3 tests)
- **compatibility/** - Seeds, configuration, validation (4 tests)

## Running Tests

```bash
# Run all CLI battle tests
npm run test:battles:cli

# Watch mode during development
npm run test:battles:watch

# Coverage report
npm run test:battles:cov
```

## Test Coverage

- Output rendering and formatting
- Theme switching and styling
- Verbose mode display
- Accessibility compliance
- Seed validation
- Configuration handling

## See Also

- [Main Battle Tests Guide](../README.md)
- [AGENTS.md - Battle Pages Section](../../AGENTS.md)
- [Final Report](../../BATTLE_TEST_CENTRALIZATION_FINAL_REPORT.md)
