# Changelog

## Unreleased

- Documented that the Next button skips the inter-round cooldown even when `skipRoundCooldown` is false.
- Added test coverage verifying manual Next clicks bypass the cooldown regardless of `skipRoundCooldown`, ensuring consistent player control when auto-skip is disabled.
- Preserve player judoka in battle store and allow headless `generateRandomCard` calls via `skipRender` option to enable stat comparisons without a DOM.
