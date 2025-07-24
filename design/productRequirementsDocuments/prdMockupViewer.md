# Mockup Viewer PRD

## Overview (TL;DR)
The Mockup Viewer provides a simple, accessible interface for browsing JU-DO-KON! design mockup images. It allows team members and stakeholders to preview all UI mockups in a carousel format, supporting both mouse and keyboard navigation. The tool ensures visual consistency and improves design review workflows by centralizing access to UI mockups.

## Problem Statement / Why It Matters
Designers and developers previously relied on scattered folder structures to find and compare UI mockups. This fragmentation led to wasted time, difficulty in referencing filenames during discussions, and inconsistent visual evaluations. By aggregating mockups into a single interactive viewer, we reduce this friction and improve team velocity, accuracy, and accessibility in design reviews.

## Goals / Success Metrics

| Goal | Metric |
|------|--------|
| Load Performance | 100% of images load within ≤1 second on broadband |
| Filename Clarity | 100% of displayed images show visible filenames |
| Accessibility | Full keyboard/mouse navigation functionality with ARIA support on 100% of controls |
| UX Responsiveness | Layout remains visually usable across desktop, tablet, and mobile |
| Engagement | 100% of mockups accessible on first visit without scrolling or filtering |

## User Stories

- As a designer, I want to quickly flip through all mockups so that I can review UI consistency.
- As a developer, I want to see the filename of each mockup so that I can reference it in discussions.
- As a stakeholder, I want to browse mockups easily without needing special tools or permissions.
- As a user with accessibility needs, I want to navigate mockups using keyboard controls and screen readers.

## Functional Requirements (Prioritized)

| Priority | Feature                        | Description                                                                                 |
|----------|--------------------------------|---------------------------------------------------------------------------------------------|
| P1       | Image Carousel                 | Display one mockup image at a time, with navigation to next/previous images.                |
| P1       | Filename Display               | Show the filename of the currently displayed mockup image.                                  |
| P1       | Mouse Navigation               | Provide "Next" and "Previous" buttons with accessible `aria-labels`.                        |
| P1       | Keyboard Navigation            | Support left/right arrow keys and tab-to-button navigation.                                 |
| P1       | Image Preloading               | Load adjacent images in advance to reduce load time.                                        |
| P2       | Accessibility                  | All controls are keyboard-accessible with ARIA attributes; use semantic HTML.               |
| P2       | Responsive Layout              | Layout adapts to different screen sizes (mobile, tablet, desktop).                          |
| P3       | Visual Effects                 | Apply simple transition effects (e.g., fade-in) on image change to improve UX.              |

## Acceptance Criteria

- [ ] The first mockup and its filename are visible on initial page load.
- [ ] Users can cycle through images using both "Next/Previous" buttons and left/right arrow keys.
- [ ] Navigation wraps from last to first and vice versa.
- [ ] Filename is always visible and legible below each image.
- [ ] Buttons are accessible with tab/enter/space keys and have descriptive `aria-labels`.
- [ ] 100% of controls are operable via keyboard and screen reader compatible.
- [ ] 100% of images load in ≤1 second on a 25 Mbps connection.
- [ ] The layout scales without content loss or overflow on mobile and desktop.
- [ ] A fade-in effect is applied when switching images.
- [ ] If an image fails to load, a broken image icon or descriptive alt text is shown.
- [ ] If no images are present, show an instructional message: “No mockups found in directory.”
- [ ] If a filename is missing or invalid, display “Unnamed_Mockup_X” with X as a fallback number.

## Non-Functional Requirements / Design Considerations

- Use JU-DO-KON! color palette, fonts, and component spacing per brand style guide.
- Apply consistent 12px/16px spacing between controls, image, and filename.
- Use semantic HTML (`<figure>`, `<figcaption>`, `<button>`, etc.).
- No external libraries or frameworks; rely on internal styles and helper modules (`setupButtonEffects.js`, `domReady.js`, etc.).
- Does not require login or permissions to access.

## Dependencies and Open Questions

- Image files must be placed in `design/mockups/`, and follow a readable naming format.
- Uses standard helper modules: `setupButtonEffects.js`, `domReady.js`, navbar and SVG fallbacks.
- Open: Should the viewer support zoom, full-screen, or download options in future versions?

## Wireframe Sketch (Suggested Additions)

**Layout Elements (Desktop View):**

**Layout Behavior:**
- On mobile: buttons stack below image, filename wraps if necessary.
- All spacing/padding respects 12px grid.
