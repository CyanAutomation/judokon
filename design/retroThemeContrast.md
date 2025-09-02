# Retro Theme Contrast

This retro palette provides a terminal-like green-on-black style.

## Colour Tokens

| Token                 | Value     |
| --------------------- | --------- |
| `--color-background`  | `#000000` |
| `--color-text`        | `#8cff6b` |
| `--color-primary`     | `#8cff6b` |
| `--color-secondary`   | `#8cff6b` |
| `--button-bg`         | `#8cff6b` |
| `--button-text-color` | `#000000` |

## Contrast Ratios

Calculated with the `wcag-contrast` package.

| Foreground | Background | Ratio   |
| ---------- | ---------- | ------- |
| `#8cff6b`  | `#000000`  | 16.63:1 |
| `#000000`  | `#8cff6b`  | 16.63:1 |

Running `npm run check:contrast` reports **No issues found**, confirming all ratios meet or exceed the WCAG AA threshold of 4.5:1.
