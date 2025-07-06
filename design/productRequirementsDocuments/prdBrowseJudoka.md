# PRD: Browse Judoka

Game Mode ID: browseJudoka (URL: browseJudoka.html)

**Browse Judoka** is accessible from the Main Page ([prdHomePageNavigation.md](prdHomePageNavigation.md)), Navigation Bar ([prdNavigationBarCollapsed.md](prdNavigationBarCollapsed.md)) or Navigation Map ([prdNavigationMap.md](prdNavigationMap.md)) and opens a full-screen roster view. Players first see a country filter panel alongside a card carousel. The carousel relies on the `buildCardCarousel` helper ([prdCardCarousel.md](prdCardCarousel.md)) and filtering uses the Country Flag Picker ([prdCountryPickerFilter.md](prdCountryPickerFilter.md)).

## TL;DR

**Browse Judoka** includes a scrollable, responsive carousel that allows players to view every available judoka card, fostering exploration, strategic team building, and a sense of ownership. This PRD defines how to implement a performant, accessible browsing experience across mobile and desktop.

> Kai hears that a new rare judoka has been added to the game, and excitedly visits the Browse Judoka screen. Swiping through the collection, he sees cards elegantly snap into place. The center card zooms slightly as it comes into focus, making it feel like a physical binder. He starts planning his next team with ease, deepening his connection to the judoka roster.

---

## Problem Statement

Players currently lack a centralized way to view all available judoka, making roster exploration cumbersome — leading to frustration and disengagement.

> _“I want to see all judoka in one place so I don’t waste time hunting for cards.”_ — Player feedback

This problem is especially pressing now as the roster grows, and players want a quick, easy way to plan their team or see which cards are available in the game.

---

## Goals

- Allow players to explore the entire roster in one place.
- Encourage discovery of new judoka to build creative teams.
- Support smooth browsing on phones and desktops.
- Increase attachment to favorite fighters through easy access.
- Keep players engaged by making team planning enjoyable.

---

## User Stories

- As a player interested in building my team, I want to browse all judoka cards quickly so I can plan my roster effectively.
- As a mobile player, I want the roster to display correctly on my phone so I can explore judoka anywhere.
- As a keyboard-only user, I want to navigate the listed cards using arrow keys so I can browse without a mouse.
- As a visually impaired player, I want focus highlights and alt text so I can browse judoka using assistive technologies.
- As a collector, I want smooth, satisfying animations when scrolling so I feel excited about exploring my roster.
- As a fan of my national team, I want to filter judoka by country so I can focus on athletes from my homeland.

---

## Functional Requirements

| Priority | Feature                         | Description                                                      |
| -------- | ------------------------------- | ---------------------------------------------------------------- |
| P1       | Scrollable Card Interface       | Allow players to scroll through the full judoka roster.          |
| P1       | Stats Data Binding              | Pull stats from `judoka.json` for accurate card display.         |
| P1       | Responsive Layout               | Adapt card layout across devices (mobile & desktop).             |
| P2       | Placeholder for Invalid Entries | Show default card if an entry is missing or invalid.             |
| P2       | Carousel Display of Cards       | Present cards in a swipe/scroll carousel for efficient browsing. |
| P2       | Hover/Keyboard Navigation       | Support interactions for accessibility.                          |
| P3       | Scroll Markers                  | Indicate the user’s current position in the carousel.            |

---

## Acceptance Criteria

**Empty List Handling**  
Given the judoka list is empty  
When the player opens the Browse Judoka screen  
Then display a message saying “No cards available”

**Load Time Performance**  
Given there are 100 judoka cards in `judoka.json`  
When the player opens the Browse Judoka screen  
Then the full list of cards loads and is visible within 1 second

**Responsive Layout**  
Given the player’s device screen width is ≥320px  
When the player views the Browse Judoka screen  
Then the cards display as:

- 1–2 cards visible on mobile (320px to ~600px width)
- 3–5 cards visible on desktop (>600px width)  
  And card layout adapts fluidly on window resize

**Invalid Entries**  
Given `judoka.json` contains an invalid or missing card entry  
When the player scrolls to that entry  
Then show a default placeholder card instead

**Scroll Performance**  
Given the player scrolls rapidly through the card carousel  
When scrolling occurs  
Then the frame rate stays at or above 30fps

**Error Handling on Data Load Failure**  
Given the network fails to load `judoka.json`  
When the player opens the Browse Judoka screen  
Then display an error message: “Unable to load roster”  
And provide a button to retry the load

**Keyboard Navigation**  
Given the player uses keyboard arrow keys  
When they press left/right arrows  
Then the focus moves to the previous/next card respectively  
And the focused card is visually highlighted and enlarged

---

## Edge Cases / Failure States

- If `judoka.json` fails to load, display an error message: “Unable to load roster.”
- If a card image fails, show the default judoka card (judoka id=0).
- On network interruption during data fetch, prompt the user to retry.

---

## Design and UX Considerations

- **Scrolling Behavior**: Implement smooth, snap scrolling to ensure a natural feel when navigating cards.
- **Visual Emphasis**: Slightly enlarge the center or active card (~10%) to give players a clear focus point.
- **Touch Targets**: Ensure interactive elements meet or exceed a minimum 48px height/width for WCAG compliance.
- **Contrast & Accessibility**: Maintain a text contrast ratio of at least 4.5:1 on card details for readability.
- **Responsiveness**:
  - On mobile devices (≥320px), display 1–2 cards visible at once.
  - On desktop, display 3–5 cards visible depending on screen width.
- **Hover & Keyboard Feedback**:
  - Enlarge cards by ~10% on hover.
  - Highlight focused cards during keyboard navigation.
- **Interaction Cues**:
  - Use subtle ripple or scaling animations when cards are tapped or clicked.
  - Show scroll markers below the card carousel to indicate progress through the roster.

| **Card Carousel Mockup 1**                                       | **Card Carousel Mockup 2**                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| ![Card Carousel Mockup](/design/mockups/mockupCardCarousel2.png) | ![Card Carousel Mockup](/design/mockups/mockupCardCarousel3.png) |

---

## Player Settings

No player settings or toggles are applicable for this feature.

---

## Dependencies

- buildCardCarousel helper for rendering cards
- Country Flag Picker for filtering

---

## Open Questions

- Should search be included in a future update?  
  _Search is planned as a future enhancement to keep initial scope focused._

---

## User Flow: Browse Judoka

**Entry**

- Player selects “Browse Judoka” from the main menu, navigation map or bottom navigation bar.
- System loads `judoka.json` data asynchronously.
- If loading fails, show error message with “Retry” button.
- If list empty, show “No cards available” message.

**Browsing**

- Cards display in a horizontal carousel.
- On mobile: 1–2 cards visible; on desktop: 3–5 cards visible.
- Player can scroll/swipe cards horizontally.
- Smooth snapping behavior to center cards on scroll end.
- Center card is visually enlarged (~10%) for focus.
- Scroll markers update to reflect current carousel position.

**Navigation**

- Player can navigate cards by:
  - Touch/swipe on mobile.
  - Mouse hover (enlarges card).
  - Keyboard arrow keys (left/right) move focus and enlarge card.
- Focused card is highlighted visually for accessibility.

**Error Handling**

- If a card image fails, show the default judoka card (judoka id=0).
- On network issues during loading, prompt with retry.

---

## Technical Considerations

- Built on `src/pages/browseJudoka.html` to load data.
- Uses `src/helpers/carouselBuilder.js` via `buildCardCarousel`.
- Integrates the Country Flag Picker for filtering.

---

## UI/UX Wireframe

+---------------------------------------------------------+
| [Browse Judoka] X| <-- Header with close/back button
+---------------------------------------------------------+
| |
| < [Card] [Card] [Card] [Card] [Card] > | <-- Carousel with scroll arrows
| |
| [Scroll Markers] | <-- Dots or progress bar below cards
| |
| [Message or Error area] | <-- Dynamic messages (loading, errors)
+---------------------------------------------------------+

**Wireframe Annotations:**

- Header: “Browse Judoka” title with a close (X) button top-right that exits browsing immediately.
- Carousel: Horizontally scrollable row of cards with left/right arrow buttons on desktop; swipe gestures on mobile.
- Cards: Each card displays judoka stats; center card is enlarged by ~10%.
- Scroll Markers: Dots below carousel indicate the current position in the list.
- Messages: Area below markers for dynamic feedback such as “No cards available” or error messages.
- Touch Targets: Cards and buttons sized ≥48px for accessibility compliance.
- Responsive Adaptation: On mobile, 1–2 cards visible; on desktop, 3–5 cards visible.

---

## Tasks

- [ ] 1.0 Initialize Browse Judoka

  - [x] 1.1 Load `judoka.json` roster data.
  - [x] 1.2 Display the Country Flag Picker filter panel.
  - [x] 1.3 Invoke `buildCardCarousel` with loaded data.

- [ ] 2.0 Responsive Layout and Accessibility

  - [ ] 2.1 Design card layouts for mobile (1-2 cards) and desktop (3-5 cards)
  - [ ] 2.2 Ensure touch targets ≥48px and WCAG 4.5:1 contrast compliance
  - [ ] 2.3 Add card enlargement on hover and keyboard focus highlighting

- [ ] 3.0 Error Handling and Edge Case Management

  - [x] 3.1 Display “No cards available” if list empty
  - [ ] 3.2 Show error message with retry if `judoka.json` fails to load
  - [ ] 3.3 Use default card for invalid/missing entries or failed images
  - [ ] 3.4 Handle network interruptions with retry prompt

- [ ] 4.0 Performance Optimization

  - [ ] 4.1 Ensure full list loads within 1 second for 100 cards
  - [ ] 4.2 Maintain ≥30fps during rapid scrolling

- [ ] 5.0 Interaction Enhancements

  - [ ] 5.1 Add ripple or scaling animation on tap/click
  - [ ] 5.2 Implement scroll markers indicating carousel position

- [ ] 6.0 Keyboard and Accessibility Support

  - [x] 6.1 Enable arrow key navigation left/right through cards
  - [ ] 6.2 Manage focus state and ensure visible outlines

---

[Back to Game Modes Overview](prdGameModes.md)
