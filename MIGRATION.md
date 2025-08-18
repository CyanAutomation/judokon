# Settings Migration Guide

This guide explains how to introduce new settings and how JU-DO-KON! overlays user values on top of defaults.

## Adding a New Setting

1. **Define the default**
   - Update `src/data/settings.json` with the new key and its default value.
   - Regenerate the frozen object in `src/config/settingsDefaults.js` by importing the updated JSON. The exported `DEFAULT_SETTINGS` object is the authoritative source for default values.
2. **Expose the control**
   - Add the corresponding UI to `src/pages/settings.html`.
   - Provide labels and descriptions in `src/data/tooltips.json` when necessary.
3. **Persist and access**
   - Use helpers from `src/helpers/settingsUtils.js` or `src/helpers/featureFlags.js` to read and write the value.
   - Update tests or schemas if the new setting requires them.

## Overlay Behavior

`DEFAULT_SETTINGS` is always cloned as the base. Stored values from `loadSettings()` overlay this object, and unknown keys are discarded via `mergeKnown`. This ensures that:

- New settings automatically fall back to their defaults when not present in storage.
- Removing a setting from `DEFAULT_SETTINGS` deletes it from cached and stored data on the next load.

Run the full test suite and formatting checks after modifying settings:

```bash
npx prettier . --check
npx eslint .
npx vitest run
npx playwright test
npm run check:contrast
```
