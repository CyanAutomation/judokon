# PRD: Judoka Card Carousel

## Problem Statement

As part of the game, certain screens, such as “Browse Judoka,” require an intuitive and interactive way to present judoka cards. With more than 100 cards in the game, it would be cumbersome and frustrating for players to browse through all cards manually without an efficient filtering and navigation system.

Failure to provide an efficient browsing experience may impact core gameplay — players might struggle to find and build optimal teams, leading to frustration and potential churn.

> A smooth and intuitive browsing experience fosters a sense of mastery and control, enhancing overall player satisfaction and engagement.

---

## Goals

- Carousel loads within 1 second for up to 100 cards.
- Filter judoka by country with response time under 500ms.
- Support smooth browsing of up to 50 cards without noticeable lag.
- Swipe gesture support for mobile browsing.
- Keyboard navigation support for accessibility.
- Users can browse through at least 10 cards within 30 seconds smoothly without lag.

---

## Functional Requirements

| Priority | Requirement                                          |
| -------- | ---------------------------------------------------- |
| P1       | Display all or filtered judoka in a carousel.        |
| P1       | Scroll left/right using on-screen buttons.           |
| P2       | Swipe gesture support on mobile devices.             |
| P2       | Cards slightly enlarge (10%) on hover.               |
| P3       | Scroll markers show user’s position in the carousel. |
| P3       | Keyboard arrow key navigation for accessibility.     |

---

## Acceptance Criteria

- Carousel loads within 1 second for up to 100 cards.
- Filter judoka by country with a response time of <500ms.
- User can scroll left/right via on-screen buttons.
- Carousel updates dynamically when filters are applied.
- User can see an indicator (scroll markers) showing current position.
- Cards enlarge by 10% when hovered over on desktop.
- Carousel is responsive, adapting to both portrait and landscape orientations.
- Swipe gestures work on mobile (left/right swipe to move cards).
- Keyboard arrow keys allow navigation through cards.
- Displays a loading spinner if load time exceeds 2 seconds.
- If network disconnection occurs, display a placeholder or error message.
- If card image fails to load, display a default judoka image.
- If a filter returns no results, show a retry option and a message suggesting a wider search.
- Playwright tests simulate swipe gestures and arrow-key navigation.
- Hovering over a card enlarges it by roughly 10%, verified via bounding box.
- A loading spinner appears during simulated slow network conditions.

---

## Edge Cases / Failure States

- **Network Disconnection**: Display a placeholder or an error message.
- **Missing/Broken Card Images**: Default fallback image is shown.
- **No Filter Results**: Show a retry option and suggest broadening the search.
- **Slow Network**: Show a loading spinner if loading exceeds 2 seconds.

---

## Design and UX Considerations

### Visuals

- Carousel will have a darker background to allow the bright, colorful judoka cards to stand out.
- Snap scrolling for smooth, natural-feeling navigation.
- Centered active card slightly larger than side cards for visual emphasis.

### Responsiveness

- Layout will adapt to mobile (one to two cards visible) and desktop (three to five cards visible).
- Card size will automatically adjust to screen size.

### Interaction

- **Touch gestures**: Swipe left/right on mobile devices.
- **Mouse hover**: Enlarge card by 10% on hover.
- **Keyboard navigation**: Support arrow keys for users with accessibility needs.

### Accessibility

- Maintain high contrast between card and background.
- Ensure buttons and interactive elements meet WCAG touch target size standards.
- Text on cards will maintain a minimum contrast ratio of 4.5:1.

---

## Wireframe / Mockup Suggestion

### Conceptual Layout

- **Desktop**: 3 cards in view — center card slightly enlarged; arrows left/right; scroll markers at the bottom.
- **Mobile**: 1.5 cards visible (peek of next card); swipe enabled; arrows optional.
- **Hover Effect**: On desktop, center card enlarges subtly.
- **Touch Interaction**: On mobile, swipe left/right; smooth snap after swipe.


| **Card Carousel Mockup 1**  | **Card Carousel Mockup 2**                                                                              | **Card Carousel Mockup 3**    |
| ---| --- | --- |
| ![Card Carousel Mockup](/design/mockups/mockupCardCarousel1.png) | ![Card Carousel Mockup](/design/mockups/mockupCardCarouse2.png)  | ![Card Carousel Mockup](/design/mockups/mockupCardCarousel3.png) |



## Tasks

- [ ] 1.0 Set Up Card Carousel Structure (P1)
  - [x] 1.1 Develop carousel container and card components.
  - [ ] 1.2 Implement dynamic loading for up to 100 cards.
  - [ ] 1.3 Ensure responsive resizing for mobile and desktop.
- [ ] 2.0 Implement Filtering System (P2)

  - [ ] 2.1 Develop filtering logic based on country.
  - [ ] 2.2 Ensure filter response under 500ms.
  - [ ] 2.3 Show "no results" state with retry and suggestions.

- [ ] 3.0 Integrate Interaction Methods (P1)

  - [x] 3.1 Add left/right on-screen button scrolling.
  - [ ] 3.2 Add swipe gesture support for mobile.
  - [ ] 3.3 Add keyboard arrow navigation support.

- [ ] 4.0 Add UI Enhancements (P2)

  - [ ] 4.1 Implement hover enlargement effect.
  - [ ] 4.2 Display scroll markers for carousel position.
  - [ ] 4.3 Implement loading spinner for slow networks.

- [ ] 5.0 Handle Edge Cases (P2)
  - [ ] 5.1 Fallback image for broken card images.
  - [ ] 5.2 Placeholder/error for network disconnections.
  - [ ] 5.3 Retry option for empty filter results.
