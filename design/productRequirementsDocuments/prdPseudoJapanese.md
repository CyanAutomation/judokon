# PRD: Pseudo-Japanese Text Conversion Function

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

---

## 3. Functional Requirements

| Priority | Feature                        | Description                                                                                                 |
|---------|---------------------------------|-------------------------------------------------------------------------------------------------------------|
| **P1**  | API call and response handling  | Query and process text conversion using external API.                                                       |
| **P1**  | Local JSON fallback             | Use local mapping if API fails.                                                                              |
| **P1**  | Toggle button                   | Instantly switch between English and pseudo-Japanese text with minimal delay.                                |
| **P2**  | Input cleaning                  | Remove unsupported characters before conversion.                                                            |
| **P2**  | Random fallback replacement     | Insert random pseudo-Japanese characters where input is unsupported.                                         |
| **P3**  | Pre-converted static fallback   | Display pre-rendered Japanese text if both API and JSON fallback fail.                                       |

---

## 4. Acceptance Criteria

- API is queried successfully for text conversion.
- If API fails, fallback to local JSON file.
- If both API and local JSON fail, show static pre-rendered text.
- Conversion process completes in <500ms for fallback.
- Input strings up to 999 characters are processed successfully.
- For unsupported characters, random pseudo-Japanese substitutes are used.
- Toggle button switches text between English and pseudo-Japanese in <200ms.
- Feature deployed on 100% of quote screens.
- Five diverse test strings are converted and validated successfully.

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

| **Quote Screen Mockup 3**                                        |                                        **Quote Screen Mockup 4** |
| ---------------------------------------------------------------- | ---------------------------------------------------------------: |
| ![Quote Screen Mockup 3](/design/mockups/mockupQuoteScreen3.png) | ![Quote Screen Mockup 4](/design/mockups/mockupQuoteScreen4.png) |

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

## Tasks

- [ ] 1.0 Implement API Integration for testing
  - [ ] 1.1 Set up API call to https://romaji2kana.com/api.
  - [ ] 1.2 Handle API response parsing and error cases.
  - [ ] 1.3 Log and report API failure events.

- [ ] 2.0 Develop Local JSON Fallback
  - [ ] 2.1 Load local JSON mapping file.
  - [ ] 2.2 Implement character mapping logic.
  - [ ] 2.3 Fallback to predefined static Japanese text if JSON fails.

- [ ] 3.0 Create Input Cleaning and Random Substitution
  - [ ] 3.1 Strip unsupported characters from input.
  - [ ] 3.2 Substitute random pseudo-Japanese characters for unsupported input.

- [ ] 4.0 Design and Implement Toggle Button
  - [ ] 4.1 Create "日本語風 / English" toggle button with split flags.
  - [ ] 4.2 Implement 200ms fade animation for text switch.
  - [ ] 4.3 Ensure toggle button fits into existing UI design guidelines.

- [ ] 5.0 Testing and QA
  - [ ] 5.1 Prepare five diverse test strings (short, max-length, special chars, mixed input).
  - [ ] 5.2 Validate API, JSON fallback, and static fallback behavior.
  - [ ] 5.3 Measure toggle response time (<200ms) and fallback conversion time (<500ms).
  - [ ] 5.4 Perform UX testing on different screen sizes.
