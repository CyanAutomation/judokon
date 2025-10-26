# Modern Theme Implementation Guide

## Overview

The modern theme introduces a reusable palette and layout primitives that ship with the redesigned settings page. The tokens live in [`src/styles/modern.css`](../../src/styles/modern.css) and are mapped onto the legacy aliases defined in `base.css`/`settings.css`. Any page can opt-in by importing `modern.css` after the base bundles and wrapping its content in `.theme-modern` (optionally paired with `[data-theme]` attributes for light/dark synchronization).

## Core token families

- **Palette** – `--modern-color-*` provides surfaces (`background`, `surface`, `surface-muted`), interactive colors (`primary`, `secondary`, `accent`), text colors (`text`, `text-muted`, `text-inverted`), and focus rings.
- **Type scale** – `--modern-font-size-*` and `--modern-font-weight-*` define typographic rhythm. `--modern-letter-spacing-wide` supports eyebrow/label treatments.
- **Radiuses & shadows** – `--modern-radius-sm|md|lg|full` and `--modern-shadow-sm|md|lg` power cards, pills, and hero panels.
- **Control tokens** – Shared hooks (`--switch-on-bg`, `--color-slider-active`, `--button-*`) cascade into `settings.css` so legacy controls automatically adopt the modern appearance.

When the theme toggles to `[data-theme="dark"]` or `[data-theme="retro"]`, the palette and control tokens are remapped, so reading the CSS custom properties is the preferred way to style elements.

## Applying the layout primitives

1. **Page shell** – Use `.modern-header` for the banner, `.modern-hero` for the headline section, and wrap the settings/content cards in `.modern-card` containers. These classes rely on the tokens above to render gradients, shadows, and rounded corners.
2. **Hero content** – Nest copy inside `.modern-hero__content` and pair the section with an accessible heading (`aria-labelledby`). Actions belong inside `.modern-hero__actions` with `.modern-hero__cta` buttons.
3. **Cards** – Each logical settings group sits inside a `.modern-card > details.settings-section` pair. Fieldsets inherit `--settings-section-bg`, `--settings-section-border`, and `--settings-search-*` from `settings.css`, so feature modules only need to append their controls.
4. **Header theme toggle** – The pill-style controls reuse the same `display-mode` values as the main form. Keep radio inputs named `header-display-mode` so the shared listener syncs header and form selections.

## Implementation checklist

- Import order: `fonts.css` → `base.css` → `layout.css` → `components.css` → `utilities.css` → `modern.css`.
- Wrap the page root in `.theme-modern` and set `data-theme` (`light`, `dark`, or `retro`) on the same node to activate palette switching.
- Prefer semantic hooks (ARIA landmarks, headings, radiogroups) because the Playwright suite asserts the presence of banner, hero, and card structures.
- When adding new components, use existing tokens before introducing new colors; if a gap exists, extend `modern.css` with additional `--modern-*` aliases so dark/retro mappings stay centralized.

Following these conventions keeps the modernized palette consistent across pages and lets the automated tests verify hero/card rendering without bespoke selectors.
