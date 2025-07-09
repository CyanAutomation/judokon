# PRD: Judoka Card Carousel

## TL;DR

This PRD defines a responsive, interactive carousel for browsing Judoka cards in Ju-Do-Kon! It supports smooth swiping, keyboard interactions, and accessibility features — ensuring players can quickly scan and select cards.

## Problem Statement

As part of the game, several screens require an intuitive and interactive way to present judoka cards. With more than 100 cards in the game (ultimate goal), it would be cumbersome and frustrating for players to browse through all cards manually without an efficient navigation system.

> Emi wants to create her ultimate Japanese Judoka team. She opens the carousel and quickly swipes through beautifully animated cards, instantly comparing stats. She feels in control, excited, and invested in building the perfect team — that’s the experience this carousel delivers.

Failure to provide an efficient browsing experience may impact core gameplay — players might struggle to find and build optimal teams, leading to frustration and potential churn.

> A smooth and intuitive browsing experience fosters a sense of mastery and control, enhancing overall player satisfaction and engagement.

## User Stories

- As a player, I want smooth scrolling so I can quickly browse a large roster of cards.
- As a player using keyboard navigation, I want to scroll through cards using arrow keys so I can browse without a mouse.
- As a mobile player, I want to swipe to move between cards so the experience feels natural and fast.

---

## Goals

**Technical Performance Goals**
- Carousel loads within 1 second for up to 150 cards.
- Support smooth browsing of up to 50 cards without noticeable lag.
- Users can browse through at least 10 cards within 30 seconds smoothly without lag.
- Swipe gesture support for mobile browsing.
- Keyboard navigation support for accessibility.

**User Experience Goals**
- Users can easily browse and find desired cards to assemble optimized teams.
- Browsing the carousel feels smooth, intuitive, and visually engaging on both mobile and desktop devices.

---

## Functional Requirements

| Priority | Requirement                                          |
| -------- | ---------------------------------------------------- |
| P1       | Display judoka in a carousel.                        |
| P1       | Scroll left/right using on-screen buttons.           |
| P2       | Swipe gesture support on mobile devices.             |
| P2       | Cards slightly enlarge (10%) on hover.               |
| P3       | Scroll markers show user’s position in the carousel. |
| P3       | Keyboard arrow key navigation for accessibility.     |

---

## Acceptance Criteria

- Carousel loads within 1 second for up to 150 cards.
- User can scroll left/right via on-screen buttons.
- User can see an indicator (scroll markers) showing current position.
- Hovering over a card enlarges it by 10%, verified via bounding box.
- Carousel is responsive, adapting to both portrait and landscape orientations.
- Swipe gestures work on mobile (left/right swipe to move cards).
- Keyboard arrow keys allow navigation through cards.
- Displays a loading spinner if load time exceeds 2 seconds.
- If card image fails to load, display a default judoka card (judoka id=0).
- Playwright tests simulate swipe gestures and arrow-key navigation.
- A loading spinner appears during simulated slow network conditions.

> **Note:** This PRD is the authoritative source for all carousel functionality, performance, and interaction requirements. Other features (e.g., Browse Judoka) reference this document for carousel-related behaviors, performance targets, and accessibility. Any updates to carousel requirements should be made here and referenced elsewhere to avoid redundancy.

---

## Edge Cases / Failure States

- **Network Disconnection**: Display a default judoka card (judoka id=0).
- **Missing/Broken Card Images**: Default fallback card is shown, display a default judoka card (judoka id=0).
- **Slow Network**: Show a loading spinner if loading exceeds 2 seconds.

---

## Technical Considerations

- Cards should lazy-load images as they enter the viewport to reduce initial load time.
- Use hardware-accelerated CSS transforms (e.g., `translate3d`) for smooth scrolling and animations.
- Carousel should debounce swipe/scroll events to prevent rapid-fire performance hits.
- Card metadata must be dynamically fetched from `judoka.json`; errors should gracefully fallback to judoka id=0.

---

## Player Flow

1. A page calls `buildCardCarousel(judokaList, gokyoData)` from `src/helpers/carouselBuilder.js`.
2. The returned element is mounted into the page (for example, `browseJudoka.html` inserts it into `#carousel-container`).
3. Carousel loads cards within 1 second; a loading spinner appears if delayed.
4. Player uses:
   - On-screen arrows to scroll,
   - Swipe gestures on mobile,
   - Or keyboard arrows for navigation.
5. Hovering enlarges cards (desktop).
6. Scroll markers show current position.
7. If an image fails to load → default judoka card is displayed.

---

## Implementation Notes

The carousel is built by `buildCardCarousel` in `src/helpers/carouselBuilder.js`.
Pages such as `src/pages/browseJudoka.html` call this helper and append the
returned element to an empty container (e.g., `#carousel-container`).

---

## Design and UX: Considerations

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

> **Integration Note:**  
> This carousel will be used in screens like [Browse Judoka](prdBrowseJudoka.md) and any future features requiring horizontal card browsing. Refer to this PRD for all carousel-related requirements to ensure consistency across the app.

---

## Design and UX: Wireframes / Mockups

### Conceptual Layout

- **Desktop**: 3 cards in view — center card slightly enlarged; arrows left/right; scroll markers at the bottom.
- **Mobile**: 1.5 cards visible (peek of next card); swipe enabled; arrows optional.
- **Hover Effect**: On desktop, center card enlarges subtly.
- **Touch Interaction**: On mobile, swipe left/right; smooth snap after swipe.

| **Card Carousel Mockup 1**                                       | **Card Carousel Mockup 2**                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| ![Card Carousel Mockup](/design/mockups/mockupCardCarousel2.png) | ![Card Carousel Mockup](/design/mockups/mockupCardCarousel3.png) |

## Tasks

- [ ] 1.0 Set Up Card Carousel Structure (P1)
  - [x] 1.1 Develop carousel container and card components.
  - [x] 1.2 Implement dynamic loading for up to 100 cards.
  - [ ] 1.3 Ensure responsive resizing for mobile and desktop.
- [ ] 2.0 Integrate Navigation Methods (P1)
  - [x] 2.1 Add left/right on-screen button scrolling.
  - [x] 2.2 Add swipe gesture support for mobile.
  - [ ] 2.3 Add keyboard arrow navigation support.
- [ ] 3.0 Add UI Enhancements (P2)
  - [x] 3.1 Implement hover enlargement effect.
  - [ ] 3.2 Display scroll markers for carousel position.
  - [ ] 3.3 Implement loading spinner for slow networks.
- [ ] 4.0 Handle Edge Cases (P2)
  - [ ] 4.1 Fallback judoka card (judoka id=0) for broken card images.
