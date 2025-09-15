# PRD: Pseudo-Japanese Text Conversion Function

---

## TL;DR

This PRD defines a Pseudo-Japanese Text Conversion Function for Ju-Do-Kon!’s meditation screen. By instantly toggling quotes between English and simulated Japanese aesthetics, it deepens immersion without requiring players to read real Japanese. The feature includes a performant local mapping system, fallback strategies, and a fast, intuitive toggle.

> After an intense battle, Mia opens the meditation screen. She taps the toggle — the quote transforms into stylized Japanese script, beautifully rendered in Mincho font. Though she doesn’t read Japanese, the aesthetic transports her to the spirit of judo, deepening her connection to the game.

---

## Problem Statement

As this game is about a Japanese martial art, authentic cultural immersion is key to the user experience. However, Japanese is complex, and most players are not literate in it. This language barrier prevents players from fully appreciating the cultural setting and diminishes the sense of authenticity.

> Players unfamiliar with Japanese miss the authentic cultural feel. Translating to pseudo-Japanese bridges this gap by simulating the aesthetics without creating a comprehension barrier.

---

## Goals

- Improve immersion by simulating Japanese aesthetics, enhancing players’ perception of authenticity, without requiring them to read or understand real Japanese.
- Achieve a 90% success rate in text conversion without errors.
- Ensure local JSON fallback conversion completes quickly.
- Toggle feature allows players to switch between original English text and pseudo-Japanese output, with quick response times.
- Support input text up to 999 characters without degradation of performance.
- Provide an authentic-feeling Japanese aesthetic without requiring language proficiency.
- Enable quick, easy switching between English and pseudo-Japanese text.

---

## Non-Goals

- No real Japanese translation or full localization; this feature is purely stylistic and does not provide actual Japanese language output.
- Not intended for use beyond the Meditation screen.
- No support for dynamic language packs or runtime localization updates.

---

## User Stories

- As a player who loves Japanese culture, I want meditation quotes to look authentically Japanese so I feel more immersed.
- As a player unfamiliar with Japanese, I want to toggle back to English instantly so I can understand the quotes.
- As a player on a slow connection, I want fallback text so the experience isn’t interrupted.

---

## Functional Requirements

| Priority | Feature                       | Description                                                                                  |
| :------: | :---------------------------- | :------------------------------------------------------------------------------------------- |
|  **P1**  | Local conversion via mapping  | Perform text conversion locally using a JSON mapping file.                                   |
|  **P1**  | API validation call           | Validate local conversion by comparing results with API response during testing.             |
|  **P1**  | Toggle button                 | Instantly switch between English and pseudo-Japanese text with minimal delay.                |
|  **P2**  | Input cleaning                | Remove unsupported characters before conversion.                                             |
|  **P2**  | Random fallback replacement   | Insert random pseudo-Japanese characters where input is unsupported.                         |
|  **P3**  | Pre-converted static fallback | Display pre-rendered Japanese text if both local mapping and validation API are unavailable. |

---

## Acceptance Criteria

- Input text is converted locally using a JSON mapping file.
- Input cleaning successfully removes unsupported characters.
- Unsupported characters are substituted with random pseudo-Japanese alternatives.
- If local mapping fails, predefined static pseudo-Japanese text is displayed.
- The toggle button switches text between English and pseudo-Japanese within 200ms.
- Local conversion for up to 999 characters completes quickly.
- Validation API (<https://romaji2kana.com/api>) used during testing phase only, not in live gameplay.
- Validation testing passes: local conversion is at least 90% identical to API conversion output in test cases.
- Feature is deployed on 100% of meditation screens.
- Five diverse test strings are processed successfully without errors.

---

## Non-Functional Requirements

- Achieve ≥90% conversion accuracy compared to API validation in test cases.
- Toggle response time is prompt for all conversions.
- Local conversion for up to 999 characters completes without noticeable delay.
- Fallback mechanism activates instantly if local mapping or API fails.
- No degradation of performance or UI responsiveness on slow devices or large input.

---

## Edge Cases / Failure States

- **Empty/Null Input:** Fall back to the predefined static Japanese text.
- **Large Input (up to 999 characters):** System must process without timeouts or UI degradation.
- **Unsupported Characters:** Substitute with random pseudo-Japanese character from defined set.
- **API/Local JSON Failure:** Use static pre-converted text without interrupting player flow.

---

## Design and UX Considerations

- The pseudo-Japanese text should simulate authentic Japanese aesthetics using a Mincho-style or Gothic calligraphy font (e.g., "Kozuka Mincho" or similar Japanese typefaces).
- Font size should match the English quote text to maintain layout balance.
- Toggle Button at the bottom of the screen:
  - Label: "日本語風 / English" that is a button showing a split of the Japan and United Kingdom flags, with a diagonal split.
  - Instant text swap or quick fade transition when toggled.
  - Visually consistent with game UI (rounded rectangle, matching color scheme).
- No plan for real Japanese localization — this feature is purely for stylistic effect.

|                       **Meditation Screen Mockup 3**                       |                       **Meditation Screen Mockup 4**                       |
| :------------------------------------------------------------------------: | :------------------------------------------------------------------------: |
| ![Meditation Screen Mockup 3](/design/mockups/mockupMeditationScreen3.png) | ![Meditation Screen Mockup 4](/design/mockups/mockupMeditationScreen4.png) |

### 1. Quote Display + Language Toggle Module

**Contents:**

- Quote block with dynamic font and max-width.
- Enlarged language toggle button (“日本語 / English”) above or below the quote.
- Fade animation when language is toggled using the `.fading` CSS class.

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

## Dependencies

- Local JSON mapping file for English-to-pseudo-Japanese conversion ([pseudoJapaneseMap.json](../../data/pseudoJapaneseMap.json) if present; see repo for details).
- Validation API: [https://romaji2kana.com/api](https://romaji2kana.com/api) (testing only, not production).
- Integrated with the Meditation screen ([PRD: Meditation Screen](prdMeditationScreen.md)).

---

## Player Flow

1. Player opens meditation screen → quote displays in English by default.
2. Player taps toggle button → text fades to pseudo-Japanese in ≤200ms.
3. Player can tap toggle again to return to English.
4. If local mapping fails → fallback static pseudo-Japanese text shown.
5. Player continues journey by tapping “Continue Your Journey.”

---

## Technical Considerations

- Local JSON mapping must be version-controlled and easily updatable without full client redeploys.
- Conversion should avoid re-rendering entire DOM — only update text nodes for performance.
- Random fallback character set must match game’s aesthetic guidelines.
- Static fallback text must be preloaded with meditation screen assets.
- Validation API only used in testing; ensure it is fully excluded in production builds.

---

## Tasks

- [x] **1.0 Implement Local Conversion System**
  - [x] 1.1 Create JSON mapping file for English-to-pseudo-Japanese conversion.
  - [x] 1.2 Develop conversion logic to map input text via JSON.
  - [x] 1.3 Implement input cleaning: strip unsupported characters.
  - [x] 1.4 Substitute random pseudo-Japanese characters for unmapped input.
- [x] **2.0 Implement Toggle Button**
  - [x] 2.1 Design "日本語風 / English" toggle button with split flags. _(Check CSS for split flag visuals; may need enhancement)_
  - [x] 2.2 Implement text toggle with fade animation. _(Fade class present; verify animation in CSS)_
  - [x] 2.3 Ensure toggle integrates cleanly with the meditation screen UI.
- [x] **3.0 Implement Static Fallback Mechanism**
  - [x] 3.1 Set predefined static pseudo-Japanese text as a final fallback.
  - [x] 3.2 Trigger fallback if local mapping fails unexpectedly.
- [ ] **4.0 Validation Testing (Non-Production)**
  - [ ] 4.1 Set up API validation call to <https://romaji2kana.com/api>. _(Not implemented)_
  - [ ] 4.2 Compare local conversion output with API results. _(Not implemented)_
  - [ ] 4.3 Log discrepancies for manual review. _(Not implemented)_
- [ ] **5.0 Testing and QA**
  - [ ] 5.1 Prepare five diverse test strings (short, max-length, special chars, mixed input). _(Not implemented)_
  - [ ] 5.2 Validate local conversion, static fallback activation, and toggle performance. _(Manual/automated test needed)_
  - [ ] 5.3 Conduct UX testing on different screen sizes and platforms. _(Not implemented)_
  - [ ] 5.4 Add Playwright test `pseudo-japanese-toggle.spec.js` verifying the language toggle on the meditation screen. _(Not implemented)_

---

[Back to Game Modes Overview](prdGameModes.md)
