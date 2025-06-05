# PRD: Pseudo-Japanese Text Conversion Function

---

## 1. Problem Statement

As this game is about a Japanese martial art, authentic cultural immersion is key to the user experience. However, Japanese is complex, and most players are not literate in it. This language barrier prevents players from fully appreciating the cultural setting.

Players unfamiliar with Japanese miss the authentic cultural feel. Translating to pseudo-Japanese bridges this gap by simulating the aesthetics without creating a comprehension barrier.

**Goal:** Improve immersion by simulating Japanese aesthetics, enhancing players’ perception of authenticity, without requiring them to read or understand real Japanese.

---

## 2. Goals

- Achieve a 90% success rate in API text conversion without errors.
- Ensure local JSON fallback conversion completes within 500ms.
- Toggle feature allows players to switch between original English text and pseudo-Japanese output, with response times under 200ms.
- Support input text up to 999 characters without degradation of performance.

---

## 3. Functional Requirements

| **Priority** | **Requirement Description**                                                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P1**       | API call and response handling: Query https://romaji2kana.com/api for conversion.                                                                                                                                                                      |
| **P1**       | Local JSON fallback: If the API fails, map using a local JSON file.                                                                                                                                                                                    |
| **P2**       | Input cleaning: Remove unsupported characters before conversion.                                                                                                                                                                                       |
| **P2**       | Random fallback replacement: For unsupported characters, substitute random pseudo-Japanese character.                                                                                                                                                  |
| **P3**       | Pre-converted static fallback: If both API and JSON fail, display predefined Japanese text: "おめでとうございます！よく頑張りましたね。本当に頑張って、そして成功したのが分かります。嘉納先生がおっしゃったように、「努力あるところに成果あり」です。" |
| **P1**       | Toggle button: Switches display between English and pseudo-Japanese text, updates instantly (<200ms).                                                                                                                                                  |

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

---

## 7. Mockup Reference

### Updated Interaction Mockup (Toggle Behavior Proposal)

Imagine the "Proceed" button area now includes a smaller button that appears as a split of the Japan and United Kingdom flags, with a diagonal split.

When tapped:

- Text in the quote box instantly fades and is replaced by the alternate language.
- No screen reload.

![Game Quote Screen With Language Toggle Mockup](/design/mockups/mockupQuoteScreen2.png)
