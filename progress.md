Round Start Modal — positioning assessment and implementation plan

## Review and Accuracy Assessment

### Scope Verification ✅
- Pages: `src/pages/battleClassic.html`, `src/pages/battleCLI.html` — **CONFIRMED**
- Component: `src/helpers/classicBattle/roundSelectModal.js` using `src/components/Modal.js` — **CONFIRMED**
- Styles: `src/styles/modal.css` imported via `src/styles/components.css` — **CONFIRMED**

### Current Behavior Assessment ✅

**Modal Architecture (verified in source):**
- `Modal` class creates `.modal-backdrop` (fixed, full-viewport) with centered `.modal` dialog
- Centering via CSS flexbox: `align-items: center; justify-content: center`
- Backdrop uses `inset: 0` covering entire viewport
- Multiple modals supported: `endModal.js`, `quitModal.js`, `roundSelectModal.js`, `createResetModal.js`

**Style Loading Verification:**
- `battleClassic.html`: ❌ Missing `components.css` link (confirmed in source)
- `battleCLI.html`: ❌ Missing `components.css` link (confirmed in source)
- Current links: `battleCLI.html` only includes `cli-immersive.css`

**Positioning Issues Confirmed:**
- Without `modal.css`: Modal renders in document flow (unstyled)
- With current CSS: Modal centers in full viewport, overlapping header/scoreboard
- Request: Position "in the middle of viewport just under scoreboard"

### Header Structure Verification ✅
- Classic page: `<header role="banner">` (no ID, line 79)
- CLI page: `<header id="cli-header" class="cli-header" role="banner">` (line 378)

### Modal Usage Analysis ✅
**Other Modal Consumers Found:**
- `src/helpers/classicBattle/endModal.js` (match end modal)
- `src/helpers/classicBattle/quitModal.js` (quit confirmation)  
- `src/helpers/settings/createResetModal.js` (settings reset)
- All use same `createModal()` API and append to `document.body`

**Compatibility Requirement:** Changes must be backwards compatible with existing modal consumers.

## Improved Implementation Plan

### Phase 0 — Enable Modal Styling (Foundation)
**Actions:**
- Add `<link rel="stylesheet" href="../styles/components.css">` to both HTML files in `<head>`
- **Placement consideration:** Add before existing `<style>` blocks to allow inline overrides
- **CLI consideration:** Place after `cli-immersive.css` to preserve CLI theme priorities

**Validation:**
- Verify modal styling loads correctly on both pages
- Confirm no visual regressions in existing modals
- Test modal focus trap, backdrop click, and Escape key still work

### Phase 1 — CSS Infrastructure for Positioning
**Enhanced Approach:**
```css
/* In src/styles/modal.css, replace inset: 0 with: */
.modal-backdrop {
  position: fixed;
  inset: var(--modal-inset-top, 0) 0 0 0;
  /* ... existing styles ... */
}

/* Add optional gap support */
.modal-backdrop.header-aware {
  --modal-gap: var(--modal-header-gap, 8px);
  inset: calc(var(--modal-inset-top, 0) + var(--modal-gap)) 0 0 0;
}
```

**Benefits:**
- Backwards compatible (default `--modal-inset-top: 0`)
- Optional gap class for enhanced positioning
- CSS-only solution for performance

### Phase 2 — Game Mode Specific Styling and Positioning

**Enhanced Component Approach:**
```javascript
// In src/helpers/classicBattle/roundSelectModal.js
function applyGameModePositioning(modal) {
  // Detect game mode from page context
  const isCliMode = document.getElementById('cli-header') !== null;
  const header = isCliMode 
    ? document.getElementById('cli-header')
    : document.querySelector('header[role="banner"]');
    
  if (header) {
    const headerHeight = header.offsetHeight;
    modal.element.style.setProperty('--modal-inset-top', headerHeight + 'px');
    modal.element.classList.add('header-aware');
    
    // Add game mode specific styling
    if (isCliMode) {
      modal.element.classList.add('cli-modal');
    } else {
      modal.element.classList.add('classic-modal');
    }
  }
}
```

**Game Mode Styling:**
```css
/* CLI mode specific modal styling */
.modal-backdrop.cli-modal .modal {
  background: #1a1a1a;
  border: 1px solid #8cff6b;
  color: #8cff6b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Classic mode specific modal styling */
.modal-backdrop.classic-modal .modal {
  /* Existing classic styling, or enhanced styling */
  background: var(--color-surface);
  /* ... */
}
```

### Phase 3 — Responsive Handling and Lifecycle Management
**Enhanced Approach:**
```javascript
// Responsive header height tracking
function createHeaderTracker(modal, header) {
  let resizeTimeout;
  const updatePosition = () => {
    const headerHeight = header.offsetHeight;
    modal.element.style.setProperty('--modal-inset-top', headerHeight + 'px');
  };
  
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updatePosition, 100); // Debounced
  };
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    clearTimeout(resizeTimeout);
  };
}
```

### Phase 4 — Testing and Validation
**Comprehensive Test Plan:**
1. **Cross-modal compatibility:** Test all existing modals (end, quit, reset) remain unaffected
2. **Responsive testing:** Verify positioning at mobile/tablet/desktop widths
3. **Game mode styling:** Confirm round select modal appears appropriately themed
4. **Accessibility:** Focus management, screen reader announcements, keyboard navigation
5. **Performance:** No layout thrashing during resize events

**Test Matrix:**
| Page | Modal Type | Position | Theme | Focus | Responsive |
|------|------------|----------|-------|-------|------------|
| Classic | Round Select | Under header | Standard | ✓ | ✓ |
| Classic | End/Quit | Full viewport | Standard | ✓ | ✓ |
| CLI | Round Select | Under header | CLI theme | ✓ | ✓ |
| CLI | End/Quit | Full viewport | CLI theme | ✓ | ✓ |

## Risk Assessment and Mitigations

### Enhanced Risk Analysis
1. **CSS Specificity Conflicts**
   - Risk: CLI overrides interfering with modal styles
   - Mitigation: Load order testing and use CSS layers if needed

2. **Performance Impact**
   - Risk: Resize listeners affecting performance
   - Mitigation: Debounced handlers and cleanup on modal close

3. **Theme Consistency**
   - Risk: Modal styling not matching game mode aesthetics
   - Mitigation: Dedicated CSS classes and theme variables

4. **Multiple Modal Stack**
   - Risk: Header-aware positioning affecting modal layering
   - Mitigation: Test with modal manager stack behavior

### Success Criteria
- ✅ Round select modal positions under scoreboard on both pages
- ✅ Modal styling matches respective game mode themes
- ✅ Zero regressions in existing modal functionality
- ✅ Responsive behavior maintains positioning integrity
- ✅ Accessibility standards maintained across all modals

## Implementation Status
**Current State:** Investigation and planning complete. Enhanced plan addresses:
- Game mode specific theming requirements
- Backwards compatibility with existing modals
- Responsive design considerations
- Performance optimization
- Comprehensive testing strategy

**Ready for Phase 0 implementation** with stakeholder approval.

Current behavior (observed in source)

- Modal markup: `Modal` creates a `.modal-backdrop` (fixed, full-viewport) with a centered `.modal` (flexbox).
- Centering: CSS in `src/styles/modal.css` centers vertically/horizontally using `align-items:center; justify-content:center;`.
- Style loading:
  - `battleClassic.html` does not link `components.css` (which imports `modal.css`).
  - `battleCLI.html` links only `cli-immersive.css` and also does not include `components.css`.
- Resulting issues:
  - Without `modal.css`, the modal backdrop/dialog have no positioning styles → the dialog may render in normal flow instead of centered.
  - With `modal.css` loaded, the backdrop covers the entire viewport (`inset: 0`) and the dialog centers in the full viewport, overlapping the scoreboard/header area. The request is for the dialog to appear “in the middle of the viewport and just under the scoreboard,” which the current `inset: 0` does not satisfy.

Constraints/considerations

- No dynamic imports in hot paths; `roundSelectModal` and `Modal` are already statically imported where used.
- Change should be additive and default-safe (no behavior change unless offset is applied) to avoid regressions in other modal use sites.
- Headers differ per page:
  - Classic page: `<header role="banner">` (no id, but reliably first header element).
  - CLI page: `<header id="cli-header" class="cli-header">` with fixed height styles.

Phased implementation plan (no code changes applied yet)

Phase 0 — Enable component styles on both pages

- Add `<link rel="stylesheet" href="../styles/components.css">` to `battleClassic.html` head.
- Add `<link rel="stylesheet" href="../styles/components.css">` to `battleCLI.html` head (coexists with `cli-immersive.css`).
- Rationale: ensures `.modal-backdrop` and `.modal` base styles are present so subsequent positioning fixes take effect.

Phase 1 — CSS support for header-aware positioning

- Update `src/styles/modal.css` to support an optional top inset variable:
  - Change `.modal-backdrop { inset: 0; }` to `.modal-backdrop { inset: var(--modal-inset-top, 0) 0 0 0; }`.
  - Keep default `--modal-inset-top: 0` so existing modals elsewhere remain unchanged.
- Effect: When a page sets `--modal-inset-top` on the backdrop (or inherited), the backdrop area starts below the header, and flex centering occurs within the remaining viewport, naturally placing the dialog “just under the scoreboard.”

Phase 2 — Apply dynamic offset on open (per page)

- In `initRoundSelectModal`, after creating the modal, compute the header height and set the CSS variable on the specific backdrop element:
  - Classic: `const header = document.querySelector('header[role="banner"], header');`
  - CLI: `const header = document.getElementById('cli-header') || document.querySelector('.cli-header');`
  - If found: `modal.element.style.setProperty('--modal-inset-top', header.offsetHeight + 'px');`
- Add a resize/orientationchange listener while the modal is open to update the value if the header wraps (mobile widths). Remove the listener on `modal.close()`/`destroy()`.
- Optional: add a small gap variable (e.g., `--modal-offset-gap`, default `8px`) if the design prefers a breathing space under the header, applying `calc(headerHeight + var(--modal-offset-gap))`.

Phase 3 — Validation

- Manual check on both pages at narrow/wide widths: dialog centers within the area below the header, does not overlap the scoreboard, and remains vertically centered relative to the remaining viewport space.
- Accessibility spot-check: focus enters the dialog as before; backdrop click and Escape close still work (unchanged by inset).
- Non-regression: open any other modal (if present) without setting the variable → behavior remains full-viewport centered.

Risks and mitigations

- Risk: Other consumers of `Modal` might expect full-viewport coverage. Mitigated by defaulting `--modal-inset-top` to `0` and only setting it for the round start modal instance.
- Risk: Header height changes on responsive wrap. Mitigated by resize/orientation listeners scoped to the open modal lifecycle.
- Risk: CSS load order on CLI page. Mitigated by adding `components.css` link before `cli-immersive.css` if any conflicts are observed (none expected for `.modal*`).

Status

- Investigation complete. No code changes performed yet. Pausing here for review before implementing Phase 0–2.
