# Footer Expanded Navigation (Expanded Map View)

## Description

The ju-do-kon! game features a need for a more immersive navigation experience that matches the game's theme. This expanded navigation aims to provide a **"Judo Training Village" visual metaphor** to guide players to various game modes. Current navigation menus feel disconnected from the game’s theme, reducing immersion.

## How It Works

When in landscape mode, clicking the central ju-do-kon logo triggers an upward slide expansion from the footer bar:

- A **“Judo Training Village” style map** appears.
- Clickable **tiles** represent different game modes.
- Each tile is a hot spot that navigates to a specific section of the game.

## Wireframes / Visual Reference

### Expanded Mode (Landscape)

Expanded map view with clickable tiles for different game modes.

*(Visual reference to be attached.)*

## Aims (Goals)

- **48px minimum touch target size** (WCAG guidelines).
- Navigation expansion animation must complete in **<500ms**.
- Maintain **≥60fps animation performance** on standard mid-tier devices (2GB RAM).
- Text labels must have a **contrast ratio of at least 4.5:1** against the background.
- Navigation task completion rate **≥98%**.
- Increase player engagement with lesser-used game modes by **20%**.
- Boost player-reported navigation satisfaction by **15%**.

## Functional Requirements

### Priority

| Priority | Feature               | Description                                                                 |
|----------|-----------------------|-----------------------------------------------------------------------------|
| **P1**   | Expanded Map View     | Slide-up game map with clickable tiles in landscape orientation.            |
|          | Responsive Scaling    | Map and tiles must scale and reposition appropriately.                      |
|          | Hover/Focus States    | Tiles should have hover animations and keyboard focus indicators.           |
|          | Fallback for Small Screens | Default to a simple text menu if the map cannot render.                  |

### Acceptance Criteria

- Clicking the ju-do-kon logo in landscape triggers a slide-up animation.
- A judo village map with clickable tiles appears.
- Clicking a tile navigates to the corresponding screen.
- Expansion/collapse animation completes in **<500ms**.
- If assets fail to load, fallback to a text-based menu.
- Touch targets must remain **≥48px**.
- Text contrast must meet **WCAG 4.5:1**.
- Animations must maintain **≥60fps**.

## Edge Cases / Failure States

- **Map Asset Loading Failure**: Fallback to a default list menu if the map fails to load.
- **Device Rotation Mid-Animation**: Cancel or reset animation smoothly.

## Design and UX Considerations

![Option 1 of Navigation Bar Expanded](/design/mockups/mockupFooterNavigationExpanded1.png)
![Option 2 of Navigation Bar Expanded](/design/mockups/mockupFooterNavigationExpanded2.png)

### Accessibility

- All tiles must have text labels and alt descriptions.
- Support keyboard navigation and screen readers, including that users can tab through all tiles and select them using the keyboard.

### Responsiveness

- Responsive scaling for different resolutions and screen sizes.

### Interaction Feedback

- Hover effects for clickable tiles.
- Ripple/tap animation for tile selections.
