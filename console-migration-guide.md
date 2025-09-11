# Console Handling Migration Guide

## Audit Results

- **Total test files analyzed**: 276
- **Files using raw console spying**: 46
- **Files using proper muting utilities**: 16
- **Raw spying instances**: 90
- **Proper muting instances**: 32

## Migration Priority Files

- **tests/helpers/dataUtils.test.js**: 8 instances (error)
- **tests/helpers/errorUtils.test.js**: 5 instances (error)
- **tests/helpers/classicBattle/debugIntegration.test.js**: 5 instances (log, warn, error, info, debug)
- **tests/helpers/timerService.cooldownGuard.test.js**: 4 instances (warn)
- **tests/helpers/carouselController.test.js**: 4 instances (warn, error)
- **tests/helpers/tooltip.test.js**: 3 instances (warn)
- **tests/helpers/showSettingsError.test.js**: 3 instances (error)
- **tests/helpers/cardUtils.test.js**: 3 instances (error)
- **tests/helpers/classicBattle/uiHelpers.missingElements.test.js**: 3 instances (warn)
- **tests/helpers/tooltipViewerPage.test.js**: 2 instances (error)

## Standard Patterns

### ❌ Current Raw Spying Pattern (To Be Replaced)

```javascript
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
// ... test code
errorSpy.mockRestore();
```

### ✅ Preferred Muting Pattern

```javascript
import { withMutedConsole } from "../utils/console.js";

await withMutedConsole(async () => {
  // Test code that would normally error/warn
});
```

### ✅ Expected Console Pattern

```javascript
import { withAllowedConsole } from "../utils/console.js";

await withAllowedConsole(async () => {
  // Test code where specific warnings/errors are expected
});
```

## Migration Commands

### Individual File Migration

```bash
# Replace raw spying pattern
sed -i 's/vi\.spyOn(console, "error")\.mockImplementation(() => {})/withMutedConsole/g' tests/path/to/file.test.js
```

### Bulk Migration (Top 10 Files)

# tests/helpers/dataUtils.test.js

npm run test -- tests/helpers/dataUtils.test.js --reporter=verbose

# tests/helpers/errorUtils.test.js

npm run test -- tests/helpers/errorUtils.test.js --reporter=verbose

# tests/helpers/classicBattle/debugIntegration.test.js

npm run test -- tests/helpers/classicBattle/debugIntegration.test.js --reporter=verbose

# tests/helpers/timerService.cooldownGuard.test.js

npm run test -- tests/helpers/timerService.cooldownGuard.test.js --reporter=verbose

# tests/helpers/carouselController.test.js

npm run test -- tests/helpers/carouselController.test.js --reporter=verbose

# tests/helpers/tooltip.test.js

npm run test -- tests/helpers/tooltip.test.js --reporter=verbose

# tests/helpers/showSettingsError.test.js

npm run test -- tests/helpers/showSettingsError.test.js --reporter=verbose

# tests/helpers/cardUtils.test.js

npm run test -- tests/helpers/cardUtils.test.js --reporter=verbose

# tests/helpers/classicBattle/uiHelpers.missingElements.test.js

npm run test -- tests/helpers/classicBattle/uiHelpers.missingElements.test.js --reporter=verbose

# tests/helpers/tooltipViewerPage.test.js

npm run test -- tests/helpers/tooltipViewerPage.test.js --reporter=verbose
