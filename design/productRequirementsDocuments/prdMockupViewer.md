# Mockup Viewer PRD

## Overview (TL;DR)
The Mockup Viewer provides a simple, accessible interface for browsing JU-DO-KON! design mockup images. It allows team members and stakeholders to preview all UI mockups in a carousel format, supporting both mouse and keyboard navigation.

## Problem Statement / Why It Matters
Designers and developers need a fast, reliable way to review all current JU-DO-KON! mockups in one place. Previously, mockups were scattered in folders, making it difficult to compare designs or reference UI details. The Mockup Viewer solves this by aggregating all mockup images into a single, navigable web page.

## Goals / Success Metrics
- Enable users to view every available mockup image with minimal friction.
- Support keyboard and mouse navigation for accessibility.
- Ensure images load quickly and display their filenames for reference.
- Provide a visually consistent, branded experience.

## User Stories
- As a designer, I want to quickly flip through all mockups so that I can review UI consistency.
- As a developer, I want to see the filename of each mockup so that I can reference it in discussions.
- As a stakeholder, I want to browse mockups easily without needing special tools or permissions.
- As a user with accessibility needs, I want to navigate mockups using keyboard controls.

## Functional Requirements (Prioritized)

| Priority | Feature                        | Description                                                                                 |
|----------|--------------------------------|---------------------------------------------------------------------------------------------|
| P1       | Image Carousel                 | Display one mockup image at a time, with navigation to next/previous images.                |
| P1       | Filename Display               | Show the filename of the currently displayed mockup image.                                  |
| P1       | Mouse Navigation               | Provide "Next" and "Previous" buttons to cycle through images.                              |
| P1       | Keyboard Navigation            | Support left/right arrow keys to navigate images.                                           |
| P1       | Image Preloading               | Load images efficiently to minimize wait time when navigating.                              |
| P2       | Accessibility                  | Ensure all controls are keyboard-accessible and have appropriate ARIA labels.               |
| P2       | Responsive Layout              | Layout adapts to different screen sizes and devices.                                        |
| P3       | Visual Effects                 | Apply simple transition effects (e.g., fade-in) when changing images.                       |

## Acceptance Criteria

- The viewer displays the first mockup image and its filename on page load.
- Clicking "Next" or "Previous" cycles through all available mockup images, wrapping at the ends.
- Pressing the left or right arrow keys navigates to the previous or next image, respectively.
- The filename of the current image is always visible below the image.
- All navigation buttons have descriptive `aria-label` attributes.
- The viewer is usable with keyboard only (tab to buttons, activate with Enter/Space).
- Images load within 1 second on a typical broadband connection.
- The layout remains usable and visually consistent on mobile and desktop screens.
- A fade-in effect is applied when the image changes.
- If an image fails to load, a broken image icon or alt text is shown.

## Non-Functional Requirements / Design Considerations

- Follows JU-DO-KON! branding and style guidelines.
- Uses semantic HTML and ARIA roles for accessibility.
- No external dependencies beyond project styles and helpers.
- Does not require authentication or special permissions.

## Dependencies and Open Questions

- Depends on the presence and naming of mockup images in `design/mockups/`.
- Uses helper modules: `setupButtonEffects.js`, `domReady.js`, and others for navbar and SVG fallback.
- Open: Should the viewer support zoom or download functionality in the future?