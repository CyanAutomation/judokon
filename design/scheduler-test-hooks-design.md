# Scheduler Test Hooks Design Document# Scheduler Test Hooks Design Document

## Overview## Overview

This document proposes test-friendly hooks for the RAF-based scheduler (`src/utils/scheduler.js`) to enable deterministic testing without global monkey-patching of `requestAnimationFrame`.This document proposes test-friendly hooks for the RAF-based scheduler (`src/utils/scheduler.js`) to enable deterministic testing without global monkey-patching of `requestAnimationFrame`.

## Current Testing Challenges## Current Testing Challenges

- Tests currently globally patch `requestAnimationFrame` (e.g., `resolution.test.js`)- Tests currently globally patch `requestAnimationFrame` (e.g., `resolution.test.js`)

- This creates brittle tests that depend on global state- This creates brittle tests that depend on global state

- Hard to isolate timing behavior between tests- Hard to isolate timing behavior between tests

- Conflicts with other test utilities that also patch globals- Conflicts with other test utilities that also patch globals

## Proposed API## Proposed API

### `createTestController()`### `createTestController()`

Returns a test controller object that allows deterministic control over the scheduler's timing:Returns a test controller object that allows deterministic control over the scheduler's timing:

`javascript`javascript

import { createTestController } from "../utils/scheduler.js";import { createTestController } from "../utils/scheduler.js";

const controller = createTestController();const controller = createTestController();

// Advance one frame// Advance one frame

controller.advanceFrame();controller.advanceFrame();

// Advance time by specific milliseconds (for second callbacks)// Advance time by specific milliseconds (for second callbacks)

controller.advanceTime(1000);controller.advanceTime(1000);

// Get frame execution count// Get frame execution count

const frameCount = controller.getFrameCount();const frameCount = controller.getFrameCount();

// Cleanup when done// Cleanup when done

controller.dispose();controller.dispose();

```



### Implementation Details### Implementation Details



- **Test-only export**: Only available when `__TEST__` environment variable is set- **Test-only export**: Only available when `__TEST__` environment variable is set

- **No global patching**: Works by injecting timing source into scheduler instance- **No global patching**: Works by injecting timing source into scheduler instance

- **Deterministic control**: Tests can advance frames/time explicitly- **Deterministic control**: Tests can advance frames/time explicitly

- **Isolation**: Each test gets its own controller instance- **Isolation**: Each test gets its own controller instance



## Compatibility Analysis## Compatibility Analysis



### Hot Paths Review### Hot Paths Review



- `src/utils/scheduler.js` is used in:- `src/utils/scheduler.js` is used in:

  - `roundManager.js` - Round lifecycle management  - `roundManager.js` - Round lifecycle management

  - `showSettingsError.js` - UI animations  - `showSettingsError.js` - UI animations

  - `typewriter.js` - Text animations  - `typewriter.js` - Text animations



### Static Import Requirements### Static Import Requirements



- No hot paths identified that require static imports- No hot paths identified that require static imports

- All usage is through dynamic imports or module-level imports- All usage is through dynamic imports or module-level imports

- Test hooks can be conditionally exported- Test hooks can be conditionally exported



## Migration Strategy## Migration Strategy



### Phase 1 Implementation### Phase 1 Implementation



1. Add `createTestController()` export to scheduler (test-only)1. Add `createTestController()` export to scheduler (test-only)

2. Implement timing source injection mechanism2. Implement timing source injection mechanism

3. Add comprehensive unit tests3. Add comprehensive unit tests



### Phase 2 Migration### Phase 2 Migration



1. Identify tests using global RAF patching1. Identify tests using global RAF patching

2. Replace with `createTestController()` usage2. Replace with `createTestController()` usage

3. Remove global monkey-patching3. Remove global monkey-patching



### Phase 3 Documentation### Phase 3 Documentation



1. Update testing guide with new patterns1. Update testing guide with new patterns

2. Add examples and migration guide2. Add examples and migration guide

3. Deprecate global patching patterns3. Deprecate global patching patterns



## Risk Assessment## Risk Assessment



### Low Risk### Low Risk



- Test-only functionality won't affect production- Test-only functionality won't affect production

- Backward compatibility maintained for existing tests- Backward compatibility maintained for existing tests

- No changes to public scheduler API- No changes to public scheduler API



### Mitigation### Mitigation



- Feature flags for gradual rollout- Feature flags for gradual rollout

- Comprehensive test coverage- Comprehensive test coverage

- Clear migration documentation- Clear migration documentation



## Acceptance Criteria## Acceptance Criteria



- Design doc reviewed and approved- Design doc reviewed and approved

- Test controller API implemented and tested- Test controller API implemented and tested

- No production bundle size impact- No production bundle size impact

- Clear migration path documented- Clear migration path documented</content>
<parameter name="filePath">/workspaces/judokon/design/scheduler-test-hooks-design.md
```
