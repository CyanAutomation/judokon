# PRD: Card Codes

---

## TL;DR

This PRD defines a Card Code Generation Function for Ju-Do-Kon!, creating short, obfuscated, human-friendly codes representing individual Judoka cards. Players can easily share, recreate, and validate their cards, boosting engagement and social play. Codes are fast to generate (<100ms), readable, tamper-resistant, and optimized for low manual entry error rates.

---

## 1. Overview

The Card Code Generation Function transforms key attributes of a Judoka (player card) into a **unique, readable alphanumeric code**. This code allows players to easily share, recreate, and validate specific Judoka cards in the game.

> **Player Feedback:**
>
> - _"I want to show my best fighter to my friend!"_ — Early playtest feedback from a hypothetical 10-year-old user.
> - _"Typing long names is annoying. Codes are cooler and easier!"_ — Anonymous feedback from playtest logs.

Players gain a sense of **ownership and pride** by sharing their custom Judoka quickly and easily **(share action <2 s)**. **Without simple sharing, engagement can drop**, especially for kids who expect fast, low-effort interactions (**<200 ms UI response**).

### Goals

- Share and recreate favorite Judoka with a short, easy-to-type code.
- Avoid frustration with typos or unreadable characters.

### System Features

- **Unique**: Each Judoka’s stats and identity produce a distinct code.
- **Obfuscated**: Prevents easy manipulation.
- **Readable**: Uses a limited, kid-friendly character set.
- **Formatted**: Improves readability and typing accuracy.

### Key Requirements

- **Security and Usability** are equally important.
- **≤100ms generation time** for producing the code.
- **Auto-generated** whenever a card is created or updated and saved into `judoka.json`.
- Code is **visible** on card screens (where relevant).
- Players can **input shared codes** with a **<2% manual entry error rate**.
- **Easy copying** and **auto-hyphenation** during code entry for better usability.

---

## 2. Purpose and Value

### For Players

Enables easy sharing and potential import/export of Judoka using compact, friendly codes.

> Toshi finishes creating his dream Judoka. He taps “Copy Code” and sends it to his friend on chat. His friend enters the code on their own device and instantly sees Toshi’s powerful fighter appear, ready for battle. Sharing feels magical — effortless, exciting, and social.

### For the Game

Adds integrity and authenticity by encoding Judoka attributes securely.

### For Developers

Simplifies storage and retrieval of Judoka data without exposing sensitive information.

---

## User Stories

- As a player who’s proud of my Judoka, I want to share a short code with friends so they can battle with or against my creation.
- As a player on mobile, I want the code entry to auto-format with hyphens so it’s easy to type and reduces errors.

---

## 3. Functional Requirements

| Priority | Feature                  | Description                                                          |
| -------- | ------------------------ | -------------------------------------------------------------------- |
| **P1**   | Input Validation         | Ensure all required Judoka fields are present and valid.             |
| **P1**   | String Concatenation     | Build the raw code string from Judoka attributes and stats.          |
| **P1**   | XOR Obfuscation          | Apply XOR encoding to obfuscate the raw string.                      |
| **P1**   | Readable Charset Mapping | Convert to a friendly 32-character readable code.                    |
| **P1**   | Chunk Formatting         | Format the code into 4-character chunks separated by hyphens.        |
| **P1**   | Save to File             | Save the generated code into `judoka.json`.                          |
| **P2**   | Error Handling           | Provide clear error messages or fallback to a generic code.          |
| **P2**   | UI Surfacing             | Display generated code with copy/paste support and input validation. |
| **P2**   | Performance Compliance   | Ensure code generation completes within 100ms.                       |

---

### 3.2 Process (P1)

1. **Concatenate Stats**
   - Combine power, speed, technique, kumikata (grip fighting), and newaza (ground grappling) into a single string.
2. **Build Raw Code String**
   - Format: `v1-FIRSTNAME-SURNAME-COUNTRY-WEIGHTCLASS-SIGNATUREMOVEID-STATS`
   - Example: `v1-TADAHIRO-NOMURA-JP-60-1234-98765`
3. **Apply XOR Encoding**
   - XOR each character’s ASCII code with `(index + 37) % 256`.
4. **Map to Readable Charset**
   - Map to: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (avoiding I, O, 1, 0).
5. **Chunking**
   - Group characters into 4-character chunks, separated by hyphens (`-`).
6. **Output**
   - Example output: `F7KP-WQ9M-ZD23-HYTR`

---

### 3.3 Output (P1)

- **Card Code**: A hyphen-separated, obfuscated alphanumeric code (e.g., `F7KP-WQ9M-ZD23-HYTR`).

---

## 4. Non-Functional Requirements

- **Readability**: Friendly character set.
- **Security**: Light obfuscation deters casual reverse-engineering.
- **Error Handling**: Standardized error messages.
- **Performance**: Code generation under 100ms.
- **Consistency**: Same input produces the same code.

---

## 5. Example

### Input

```json
{
  "firstname": "Tadahiro",
  "surname": "Nomura",
  "country": "JP",
  "weightClass": 60,
  "signatureMoveId": 1234,
  "stats": {
    "power": 9,
    "speed": 8,
    "technique": 7,
    "kumikata (grip fighting)": 6,
    "newaza (ground grappling)": 5
  }
}
```

### Output

```
F7KP-WQ9M-ZD23-HYTR
```

---

## 6. Acceptance Criteria

- Given a valid Judoka, when code generation runs, a valid code is produced.
- Given a Judoka with missing fields, fallback to a generic code.
- Generated codes use only A–Z, 2–9, and hyphens.
- Codes group characters into 4-character hyphenated chunks.
- The same Judoka always yields the same output code.
- Code generation completes in under 100ms.
- Manual code entry must have an error rate under 2% on average.

---

## 7. Edge Cases / Failure States (P2)

- Very large or malicious strings.
- Potential code collisions.
- Encoding failures or memory issues.

**Fallback:** Display a generic card code (judoka id=0) if any failure occurs.

---

## 8. Wireframes

| **Card Code Display and Entry Mockup 1**                                     | **Card Code Display and Entry Mockup 2**                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| ![Card Code Display and Entry Mockup 1](/design/mockups/mockupCardCode1.png) | ![Card Code Display and Entry Mockup 2](/design/mockups/mockupCardCode2.png) |

---

## 9. Developer Notes

### 9.1 Encoding Strategy Rationale

- **XOR Obfuscation:** Lightweight, fast (**<100 ms**), non-cryptographic.
- **Readable Character Set:** Improves accuracy (no I, O, 1, 0).
- **Hyphenation:** Easier error detection.
- **Versioning:** Ensures backward compatibility.

### 9.3 Limitations

- XOR is not cryptographic.
- No cryptographic collision-proofing.
- No decoding to avoid tampering.

### 9.4 Potential Enhancements

- Customizable chunk size.
- Add checksum digit to detect manual entry errors.
- Admin-only decode function for tournament verification.
- Salt/nonce for reduced collisions.

### 9.5 UI Input Considerations

- Code visible on card detail screens, where relevant.
- Copy-to-clipboard button (44x44px target size).
- Input field with auto-hyphenation.
- Invalid character prevention at input level.

---

## 10. Player Flow

**Code Generation and Sharing Flow**

- Player creates or updates Judoka → system generates code.
- Code saved to judoka.json and displayed on card detail screen.
- Player taps copy button → code copied to clipboard.
- Player sends code to friend.
- Friend opens code entry screen → types or pastes code.
- System validates and reconstructs Judoka or shows error.

---

## Tasks

- [ ] 1.0 Card Code Generation Function
  - [x] 1.1 Validate input Judoka object for all required fields.
  - [x] 1.2 Concatenate Judoka stats and key attributes into raw string.
  - [x] 1.3 Apply XOR encoding with index-based key.
  - [x] 1.4 Map encoded string to 32-character readable alphabet.
  - [x] 1.5 Format string into chunks of 4 characters with hyphens.
  - [x] 1.6 Return the final formatted code.
  - [ ] 1.7 Save the generated code into `judoka.json`.
- [ ] 2.0 Error Handling and Edge Cases
  - [ ] 2.1 Fallback to a generic card code (judoka id=0) if encoding fails.
  - [ ] 2.2 Handle unusually large string input safely.
- [ ] 3.0 Unit Tests
  - [x] 3.1 Test valid Judoka object produces correct code format.
  - [x] 3.2 Test invalid input triggers correct error fallback.
  - [x] 3.3 Test same input always results in the same output code.
  - [ ] 3.4 Simulate edge cases like large inputs and validate fallback behavior.
- [ ] 4.0 UI Surface Interaction
  - [ ] 4.1 Ensure the generated code is visible on relevant card display screens.
  - [ ] 4.2 Support copy-to-clipboard functionality.
  - [ ] 4.3 Add input validation for code entry screens.
  - [ ] 4.4 Implement auto-hyphenation as players type shared codes.

---

[Back to Game Modes Overview](prdGameModes.md)
