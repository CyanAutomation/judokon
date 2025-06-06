PRD – Function to Draw Random Card

⸻

Problem Statement

As part of the web browser-based game Ju-Do-Kon!, players often need to draw a random card during matches. This mechanic injects vital excitement and unpredictability, ensuring players never know what card will come next. The uncertainty heightens the tension of one-on-one battles, making matches feel dynamic, surprising, and deeply engaging.

Without this feature, players would be forced to pre-select cards, leading to predictable, repetitive gameplay that diminishes replayability and player engagement.

Playtest feedback:

“I love not knowing what card will pop up next — it makes it so much more exciting!” — Sanshiro, age 10

This function is critical for:
	•	Enhancing pacing — sustaining game flow without manual selection delays.
	•	Increasing replayability — ensuring different match outcomes on each playthrough.
	•	Boosting session duration — expected to increase session time by at least 10% due to heightened player engagement and tension.

⸻

How It Works
	•	The player taps the “Draw Card” button or navigates to a designated card draw screen.
	•	This action auto-triggers the generateRandomCard() function.
	•	The system:
	•	Selects a random Judoka card from the active card set.
	•	Visually reveals the card with a fade or bounce animation.
	•	Plays a short celebratory sound (e.g., swoosh or chime).
	•	Ensures animation smoothness at ≥60fps for devices with ≥2GB RAM.
	•	Active card set: The current pool of cards available in the player’s deck, dynamically updated based on the game state.

⸻

Cancellation and Undo Flow

To prevent frustration from accidental taps:
	•	When a player taps “Draw Card”, show a short 2-second undo banner (“Undo Draw?”).
	•	If the player taps Undo within the window, cancel the random draw action.
	•	If not, complete the random card reveal.

⸻

Edge Cases / Failure States
	•	Same Card Reselection: Duplicates are possible and expected — randomness allows repeats.
	•	Random Pick Failure: If random draw fails (e.g., due to a code error), show a fallback card with a clear error notification.
	•	Empty Card Set: Display a predefined error card if no cards are available.
	•	Low Performance Devices: Automatically downgrade to a static reveal if animations cannot sustain 60fps.
	•	Accessibility:
	•	Respect system Reduced Motion settings — disable animations if active.
	•	Default: Animations ON, but respect system/user preferences.

⸻

Goals

Goal	Metric
Fast Response	Card draw completes in under 300ms.
Smooth Animation	Reveal animation plays at ≥60fps with no visual glitches.
Fair Randomness	Random selection passes chi-square testing for uniformity, 95% confidence over 100 draws.
Low Failure Rate	No more than 1% draw failures.
Accessibility	Automatically disable animations if system Reduced Motion is active.


⸻

Acceptance Criteria
	•	When “Draw Card” is triggered, a random card from the active set is displayed within 300ms.
	•	A reveal animation (fade or bounce) completes within 500ms at ≥60fps on mid-tier devices.
	•	If the random function fails, a fallback card is shown, and an error message is displayed.
	•	Random distribution passes chi-square test with 95% confidence over 100 draws.
	•	If the active card set is empty, an error card is shown.
	•	Animation is disabled if the user has enabled Reduced Motion settings.
	•	A 2-second undo banner is shown immediately after tapping “Draw Card”.

⸻

Prioritized Functional Requirements

Priority	Feature	Description
P1	Random Card Selection	Select a random card from the active card set dynamically.
P1	Display Selected Card	Visually reveal the selected card with animation and sound feedback.
P2	Fallback on Failure	Show fallback card and error message if draw fails or active set is empty.
P2	Undo Draw Option	Allow player to undo a draw within 2 seconds after triggering it.
P2	Reusable Random Draw Module	Make the random draw callable from multiple game states or screens.
P3	Accessibility Support	Support Reduced Motion settings and maintain color contrast and readability.
P3	UX Enhancements	Optimize for 60fps animation, sound effect, and large tap targets.
P3	Sound & Animation User Toggles	Allow users to manually mute sounds and disable animations if desired.


⸻

Design and User Experience Considerations
	•	Animation Style: Fade or bounce only — no flips or excessive transitions to keep visuals polished.
	•	Sound Effect: Short celebratory chime or swoosh (<1 second).
	•	Responsiveness:
	•	Smooth transitions at ≥60fps on devices with ≥2GB RAM.
	•	Degrade to static reveal if hardware performance is low.
	•	Accessibility:
	•	Respect system Reduced Motion settings (disable animations automatically).
	•	Ensure color contrast and text readability on cards (WCAG AA compliance).
	•	Default Setting: Animations and sound ON unless user/system preferences state otherwise.
	•	Fallback Visuals:
	•	If card loading fails, show a placeholder/error graphic (e.g., a “?” card).
	•	Tap Target Size:
	•	All interactive elements (Draw button, Undo banner) must be ≥48px in height and width, with a recommended 64px for kid-friendly ease.

⸻

## Tasks

- [ ] 1.0 Implement Random Card Draw Function
  - [ ] 1.1 Create `generateRandomCard()` function to select random card from active set.
  - [ ] 1.2 Integrate card draw with UI trigger ("Draw Card" button).
  - [ ] 1.3 Handle duplicate cards as valid outcomes.
  - [ ] 1.4 Implement chi-square test for randomness validation over 1,000 draws.

- [ ] 2.0 Develop Card Reveal Animation
  - [ ] 2.1 Implement fade or bounce animation for card reveal.
  - [ ] 2.2 Ensure animation plays at ≥60fps on devices with ≥2GB RAM.
  - [ ] 2.3 Respect Reduced Motion settings and disable animation when active.

- [ ] 3.0 Error and Fallback Handling
  - [ ] 3.1 Display fallback card and error message if random draw fails.
  - [ ] 3.2 Show predefined error card if active card set is empty.
  - [ ] 3.3 Implement static reveal downgrade for low-performance devices.

- [ ] 4.0 Undo Draw Functionality
  - [ ] 4.1 Display 2-second undo banner after card draw initiation.
  - [ ] 4.2 Cancel draw if Undo is tapped within 2 seconds.

- [ ] 5.0 Accessibility and UX Enhancements
  - [ ] 5.1 Support Reduced Motion settings.
  - [ ] 5.2 Ensure color contrast on cards meets WCAG AA standards.
  - [ ] 5.3 Set all tap targets to ≥48px, recommended 64px for better kid usability.
  - [ ] 5.4 Add sound and animation toggle options for user preferences.
