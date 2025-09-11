# Battle CLI Guide

This document provides comprehensive guidance for using and developing with the Classic Battle CLI interface.

## Overview

The Battle CLI (`src/pages/battleCLI.html`) provides a terminal-style UI that reuses the Classic Battle engine and state machine, offering a text-first interface for the core gameplay.

## User Interface

### Controls

- **Number keys [1–5]**: Select stats
- **Enter/Space**: Advance rounds
- **Q**: Quit match
- **H**: Toggle help panel
- **Esc**: Close help or quit dialogs

### Interactive Elements

- **Stats**: Can be selected by clicking/tapping in addition to keyboard input
- **Round advancement**: Click to advance rounds
- **Help panel**: Closing with the button ignores the next background click to avoid accidental advancement

### Display Elements

- **State badge**: `#battle-state-badge` reflects the current machine state
- **Bottom line**: Snackbars render as a single status line using `#snackbar-container`
- **Win target**: Choose 5/10/15 from the header; persisted in localStorage under `battleCLI.pointsToWin`
- **Verbose log**: Optional header toggle to record recent state transitions

## Development

### Bootstrap Helpers

The following functions orchestrate CLI startup:

- `autostartBattle()`: Initializes the battle system
- `renderStatList()`: Renders available stat options
- `restorePointsToWin()`: Restores saved win target preference

### Testing

CLI-specific tests live in `playwright/battle-cli.spec.js` and verify:

- State badge functionality
- Verbose log behavior
- Keyboard selection flow
- UI state transitions

### Implementation Details

The CLI reuses the core battle engine and state machine from the standard Classic Battle mode, providing interface parity with different presentation.

## Related Documentation

- [Battle Engine Events API](./components.md) - Engine event system
- [Testing Guide](./testing-guide.md) - Testing strategies and utilities
- [Architecture](../design/architecture.md) - Overall system design
