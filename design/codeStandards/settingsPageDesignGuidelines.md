# JU-DO-KON! Settings Page Design Guidelines

To ensure the **Settings** page remains consistent, visually appealing, and accessible as new features are added, developers and AI agents should follow these guidelines. The goal is to preserve a unified layout and style while maintaining high accessibility standards.

---

## Layout Guidelines

- **Section Grouping with Fieldsets**  
  Organize settings into logical sections using `<fieldset>` elements with descriptive `<legend>` titles. Each section (e.g. “Display Settings”, “General Settings”, “Game Modes”) should group related controls.  
  _Example: The page currently has a “General Settings” fieldset for toggles like Sound, Navigation Map, and Motion._

- **Consistent Form Structure**  
  Use one `<form>` per section or a single form containing multiple `<fieldset>`s. Ensure consistency across all sections.

- **Settings Item Container**  
  Wrap each setting control in a `<div class="settings-item">` for modularity and consistent spacing.

- **Grid Layout for Controls**  
  Use the `.game-mode-toggle-container` class on fieldsets to enable responsive grid layouts:
  - 3-column layout on desktop
  - 1-column stacked layout on mobile

- **Responsive Design Preservation**  
  New settings should stack vertically on mobile and arrange into columns on larger screens without breaking layout.

- **Page Hierarchy**  
  Maintain a logical top-down structure: main title `<h1>`, followed by fieldsets in an intuitive order (e.g. general → game-specific → advanced).

- **Navigation and Tab Order**  
  Place controls in top-down, left-to-right order in the HTML to preserve logical keyboard navigation.

---

## Styling Guidelines

- **Use Existing Classes**
  - `.settings-form` on form/fieldset wrappers
  - `.settings-item` on individual setting containers

- **Fieldset Styling**
  - Reuse section `<legend>` headings with consistent styles (font: Russo One, 24px).

- **Toggle Switch Pattern**
  Use the existing custom toggle structure:

  ```html
  <label for="new-toggle-id" class="switch">
    <input type="checkbox" id="new-toggle-id" name="newSetting" aria-label="New Setting Name" />
    <div class="slider round"></div>
    <span>New Setting Name</span>
  </label>
  ```

- **Select Boxes / Radio Buttons**
  - Use standard `<select>` or `<input type="radio">`, styled within the form using built-in styles (dark background, padding, rounded borders).

- **Typography**
  - Headings: Russo One
  - Body text: use base font set in `base.css`

- **Colors**
  - Use CSS variables: `--color-primary`, `--button-bg`, etc.
  - Do not hard-code color values.
  - Ensure all new elements work across Light, Dark, and Gray themes.

- **Spacing and Sizing**
  - Use `--space-sm`, `--space-md`, etc. for margins/padding
  - Minimum input height: 48px for tap targets

---

## Accessibility & UX Guidelines

- **Keyboard Navigation**
  - All controls must be focusable with Tab
  - Use visible focus indicators (do not remove outlines)

- **ARIA Labels and Roles**
  - Use `<label>` where possible
  - For custom toggles, add `aria-label` to `<input>`
  - Fieldsets should include meaningful `<legend>`

- **Screen Reader Considerations**
  - State changes must be announced via native semantics
  - Use `role="alert"` for error messages if needed
  - Avoid hiding important content visually or semantically

- **Color Contrast**
  - Minimum contrast ratio of 4.5:1 for text
  - Test readability in all themes

- **Visible Indicators and Feedback**
  - Settings must provide immediate visual feedback
  - Toggle positions, colors, and states must be unambiguous

- **Touch and Click Target Size**
  - Minimum target size: 44px × 44px
  - Ensure padding/margins make elements easy to interact with

- **Consistent UX Behavior**
  - No "Save" button – all changes are instant
  - Use existing `updateSetting()` pattern for persistence
  - Reflect current saved values on page load
  - Integrate with existing error feedback mechanisms

- **Change Log Link**
  - Add a clearly labeled link (e.g., "View Change Log") to the settings page, styled as a `.settings-item`.
  - Place after all settings controls, before the error popup container.
  - The link should point to `changeLog.html` and be accessible via keyboard (tabindex set appropriately).

- **Links Section**
  - Group supplemental pages under a `Links` heading using a simple `<fieldset>`.
  - Include links to `changeLog.html`, `prdViewer.html`, and `mockupViewer.html`.
  - Style each as a `.settings-item` and assign sequential `tabindex` values (e.g., 99, 100, 101).
  - Position this fieldset after all setting controls and before the error popup container.

- **Error Message Container & ARIA**
  - Include a dedicated error popup container (e.g., `<div id="settings-error-popup" role="alert" aria-live="assertive">`).
  - All error messages must be routed through this container for accessibility.
  - Ensure error popups are visually distinct and disappear after a short timeout (e.g., 3 seconds).

---

## Collapsible Settings Sections (Recommended Pattern)

To improve organization and reduce visual clutter, each major settings area (e.g., General Settings, Game Modes) should be collapsed by default and expandable via click or keyboard toggle. This pattern enhances accessibility and scalability as more settings are added.

### Markup Example

```html
<div class="settings-section">
  <button type="button" class="settings-section-toggle" aria-expanded="false" aria-controls="general-settings-content" id="general-settings-toggle">
    General Settings
  </button>
  <div class="settings-section-content" id="general-settings-content" role="region" aria-labelledby="general-settings-toggle" hidden>
    <fieldset> ...settings controls... </fieldset>
  </div>
</div>
```

- Repeat for each section (e.g., Game Modes).
- The toggle button must be keyboard-focusable and operable (Enter/Space).
- Toggle buttons must use `type="button"` to avoid submitting the form.
- Use `aria-expanded`, `aria-controls`, and `aria-labelledby` for accessibility.
- The content div should be hidden by default (`hidden` attribute or `display: none;`).

### Interaction & Accessibility
- Clicking or pressing Enter/Space on the toggle expands/collapses the section and updates `aria-expanded`.
- Only one or multiple sections may be open at a time (choose per UX needs).
- All controls inside the section remain tabbable and accessible when expanded.
- Use CSS transitions for smooth expand/collapse if desired.

### Styling
- Use `.settings-section`, `.settings-section-toggle`, and `.settings-section-content` classes for structure and styling.
- Ensure toggle buttons and content meet touch target and contrast requirements.

### Testing Checklist (add to existing)
- [ ] Section toggles are keyboard and screen reader accessible
- [ ] Collapsed sections hide content from screen readers and tab order
- [ ] Expanding a section reveals its controls in tab order

---

## Testing Checklist

After adding a setting:

- [ ] Can it be focused with Tab?
- [ ] Is it labeled for screen readers?
- [ ] Does it follow tab order logically?
- [ ] Does it work in all display modes?
- [ ] Is it keyboard operable?
- [ ] Does it use appropriate styles and classes?

---

By following these layout, styling, and accessibility guidelines, any additional features will blend seamlessly into the Settings page. The result will be a settings interface that scales with new options while remaining organized, visually cohesive, and usable for all players.
