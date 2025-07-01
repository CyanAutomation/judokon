# PRD: Pseudo-Japanese Text Conversion Function

---

## TL;DR

This PRD defines a Pseudo-Japanese Text Conversion Function for Ju-Do-Kon!’s meditation screen. By instantly toggling quotes between English and simulated Japanese aesthetics, it deepens immersion without requiring players to read real Japanese. The feature includes a performant local mapping system, fallback strategies, and a fast, intuitive toggle.

> After an intense battle, Mia opens the meditation screen. She taps the toggle — the quote transforms into stylized Japanese script, beautifully rendered in Mincho font. Though she doesn’t read Japanese, the aesthetic transports her to the spirit of judo, deepening her connection to the game.

---

## 1. Problem Statement

As this game is about a Japanese martial art, authentic cultural immersion is key to the user experience. However, Japanese is complex, and most players are not literate in it. This language barrier prevents players from fully appreciating the cultural setting.

> Players unfamiliar with Japanese miss the authentic cultural feel. Translating to pseudo-Japanese bridges this gap by simulating the aesthetics without creating a comprehension barrier.

**Goal:** Improve immersion by simulating Japanese aesthetics, enhancing players’ perception of authenticity, without requiring them to read or understand real Japanese.

---

## 2. Goals

- Achieve a 90% success rate in API text conversion without errors.
- Ensure local JSON fallback conversion completes within 500ms.
- Toggle feature allows players to switch between original English text and pseudo-Japanese output, with response times under 200ms.
- Support input text up to 999 characters without degradation of performance.
- Provide an authentic-feeling Japanese aesthetic without requiring language proficiency.
- Enable quick, easy switching between English and pseudo-Japanese text.

### User Stories

- As a player who loves Japanese culture, I want meditation quotes to look authentically Japanese so I feel more immersed.
- As a player unfamiliar with Japanese, I want to toggle back to English instantly so I can understand the quotes.
- As a player on a slow connection, I want fallback text so the experience isn’t interrupted.

---

## 3. Functional Requirements

| Priority | Feature                       | Description                                                                                  |
| -------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| **P1**   | Local conversion via mapping  | Perform text conversion locally using a JSON mapping file.                                   |
| **P1**   | API validation call           | Validate local conversion by comparing results with API response during testing.             |
| **P1**   | Toggle button                 | Instantly switch between English and pseudo-Japanese text with minimal delay.                |
| **P2**   | Input cleaning                | Remove unsupported characters before conversion.                                             |
| **P2**   | Random fallback replacement   | Insert random pseudo-Japanese characters where input is unsupported.                         |
| **P3**   | Pre-converted static fallback | Display pre-rendered Japanese text if both local mapping and validation API are unavailable. |

---

## 4. Acceptance Criteria

- Input text is converted locally using a JSON mapping file.
- Input cleaning successfully removes unsupported characters.
- Unsupported characters are substituted with random pseudo-Japanese alternatives.
- If local mapping fails, predefined static pseudo-Japanese text is displayed.
- The toggle button switches text between English and pseudo-Japanese within 200ms.
- Local conversion for up to 999 characters completes in <500ms.
- Validation API (https://romaji2kana.com/api) used during testing phase only, not in live gameplay.
- Validation testing passes: local conversion is at least 90% identical to API conversion output in test cases.
- Feature is deployed on 100% of meditation screens.
- Five diverse test strings are processed successfully without errors.

---

## 5. Edge Cases / Failure States

- **Empty/Null Input:** Fall back to the predefined static Japanese text.
- **Large Input (up to 999 characters):** System must process without timeouts or UI degradation.
- **Unsupported Characters:** Substitute with random pseudo-Japanese character from defined set.
- **API/Local JSON Failure:** Use static pre-converted text without interrupting player flow.

---

## 6. Design and UX Considerations

- The pseudo-Japanese text should simulate authentic Japanese aesthetics using a Mincho-style or Gothic calligraphy font (e.g., "Kozuka Mincho" or similar Japanese typefaces).
- Font size should match the English quote text to maintain layout balance.
- Toggle Button at the bottom of the screen:
  - Label: "日本語風 / English" that is a button showing a split of the Japan and United Kingdom flags, with a diagonal split.
  - Instant text swap or quick fade transition (≤200ms) when toggled.
  - Visually consistent with game UI (rounded rectangle, matching color scheme).
- No plan for real Japanese localization — this feature is purely for stylistic effect.

| **Meditation Screen Mockup 3**                                             |                                             **Meditation Screen Mockup 4** |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------: |
| ![Meditation Screen Mockup 3](/design/mockups/mockupMeditationScreen3.png) | ![Meditation Screen Mockup 4](/design/mockups/mockupMeditationScreen4.png) |

### 1. Quote Display + Language Toggle Module

**Contents:**

- Quote block with dynamic font and max-width.
- Enlarged language toggle button (“日本語 / English”) above or below the quote.
- 200ms fade animation when language is toggled.

**Why:**  
Enhances contextual clarity and smooth interaction, keeping actions tied to relevant content.

---

### 2. Action Button Module

**Contents:**

- Large, thumb-friendly “Continue Your Journey” button.
- Clear visual separation from quote/toggle above.

**Why:**  
Prevents accidental taps and creates distinct flow—finish reading before proceeding.

---

## Player Flow

- Player opens meditation screen → quote displays in English by default.
- Player taps toggle button → text fades to pseudo-Japanese in ≤200ms.
- Player can tap toggle again to return to English.
- If local mapping fails → fallback static pseudo-Japanese text shown.
- Player continues journey by tapping “Continue Your Journey.”

---

## Technical Considerations

- Local JSON mapping must be version-controlled and easily updatable without full client redeploys.
- Conversion should avoid re-rendering entire DOM — only update text nodes for performance.
- Random fallback character set must match game’s aesthetic guidelines.
- Static fallback text must be preloaded with meditation screen assets.
- Validation API only used in testing; ensure it is fully excluded in production builds.

---

## Tasks

- [ ] 1.0 Implement Local Conversion System

  - [ ] 1.1 Create JSON mapping file for English-to-pseudo-Japanese conversion.
  - [ ] 1.2 Develop conversion logic to map input text via JSON.
  - [ ] 1.3 Implement input cleaning: strip unsupported characters.
  - [ ] 1.4 Substitute random pseudo-Japanese characters for unmapped input.

- [ ] 2.0 Implement Toggle Button

  - [ ] 2.1 Design "日本語風 / English" toggle button with split flags.
  - [ ] 2.2 Implement text toggle with 200ms fade animation.
  - [ ] 2.3 Ensure toggle integrates cleanly with the meditation screen UI.

- [ ] 3.0 Implement Static Fallback Mechanism

  - [ ] 3.1 Set predefined static pseudo-Japanese text as a final fallback.
  - [ ] 3.2 Trigger fallback if local mapping fails unexpectedly.

- [ ] 4.0 Validation Testing (Non-Production)

  - [ ] 4.1 Set up API validation call to https://romaji2kana.com/api.
  - [ ] 4.2 Compare local conversion output with API results.
  - [ ] 4.3 Log discrepancies for manual review.

- [ ] 5.0 Testing and QA
  - [ ] 5.1 Prepare five diverse test strings (short, max-length, special chars, mixed input).
  - [ ] 5.2 Validate local conversion, static fallback activation, and toggle performance.
  - [ ] 5.3 Ensure <500ms conversion time and <200ms toggle response.
  - [ ] 5.4 Conduct UX testing on different screen sizes and platforms.
  - [ ] 5.5 Add Playwright test `pseudo-japanese-toggle.spec.js` verifying the language toggle on the meditation screen.
        [Back to Game Modes Overview](prdGameModes.md)
