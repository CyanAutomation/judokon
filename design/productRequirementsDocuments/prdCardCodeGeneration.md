# PRD: Card Code Generation Function

---

## 1. Overview

This document defines the specifications for the **Card Code Generation Function** in the *JU-DO-KON!* web-based card game.

The Card Code Generation Function transforms key attributes of a Judoka (player card) into a **unique, readable alphanumeric code**. This code allows players to easily share, recreate, and validate specific Judoka cards in the game.

> *"I want to show my best fighter to my friend and have them battle me with it!"* — Early playtest feedback from a 10-year-old user.

> *"Typing long names is annoying. Codes are cooler and easier!"* — Anonymous feedback from playtest logs.

Players gain a sense of **ownership and pride** by sharing their custom Judoka quickly and easily. **Without simple sharing, engagement can drop**, especially for kids who expect fast, low-effort interactions.

The system ensures that:
- The code is **unique** to each Judoka’s stats and identity.
- The code is **obfuscated** to prevent easy manipulation.
- The code is **readable**, using a limited, kid-friendly character set.
- The code is **formatted** to improve readability and typing accuracy.

Key Requirements:
- **Security and Usability** are equally important.
- **≤100ms generation time** for producing the code.
- **Auto-generated** whenever a card is created or updated and saved into `judoka.json`.
- Code is **visible** on card screens.
- Players can **input shared codes** with a **<2% manual entry error rate**.
- **Easy copying** and **auto-hyphenation** during code entry for better usability.

---

## 2. Purpose and Value

- **For Players**: Enables easy sharing and import/export of Judoka using compact, friendly codes.
- **For the Game**: Adds integrity and authenticity by encoding Judoka attributes securely.
- **For Developers**: Simplifies storage and retrieval of Judoka data without exposing sensitive information.

---

## 3. Functional Requirements

| Priority | Feature                     | Description                                                        |
|--------- |-----------------------------|-------------------------------------------------------------------- |
| **P1**   | Input Validation             | Ensure all required Judoka fields are present and valid.           |
| **P1**   | String Concatenation         | Build the raw code string from Judoka attributes and stats.        |
| **P1**   | XOR Obfuscation              | Apply XOR encoding to obfuscate the raw string.                    |
| **P1**   | Readable Charset Mapping     | Convert to a friendly 32-character readable code.                  |
| **P1**   | Chunk Formatting             | Format the code into 4-character chunks separated by hyphens.      |
| **P1**   | Save to File                 | Save the generated code into `judoka.json`.                        |
| **P2**   | Error Handling               | Provide clear error messages or fallback to a generic code.        |
| **P2**   | UI Surfacing                 | Display generated code with copy/paste support and input validation. |
| **P2**   | Performance Compliance       | Ensure code generation completes within 100ms.

---

### 3.2 Process (P1)

1. **Concatenate Stats**
   - Combine power, speed, technique, kumikata, and newaza into a single string.

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

--


## 6. Acceptance Criteria

| ID   | Criterion                                                                 | Pass/Fail |
|----- |-------------------------------------------------------------------------- |---------- |
| AC1  | Given a valid Judoka, When code generation runs, Then a valid code is produced.   |          |
| AC2  | Given a Judoka with missing fields, When code generation runs, Then a clear error message is shown. |          |
| AC3  | Given a generated code, Then it must use only A–Z, 2–9, and hyphens.      |          |
| AC4  | Given a code, Then it must group characters into 4-character hyphenated chunks. |          |
| AC5  | Given the same Judoka object, Then the output code must be identical.     |          |
| AC6  | When code generation runs, Then it must complete in under 100ms.          |          |
| AC7  | Given manual code input, Then error rate must be under 2% on average.     |          |

---

## 7. Edge Cases / Failure States (P2)

- Very large or malicious strings (e.g., 5000-character name).
- Potential code collisions.
- Encoding failures or memory issues.

**Fallback:** Display a generic code if any failure occurs.

---

## 8. Wireframes

### Card View (Display code)
- Show code below the card’s main stats.
- Copy-to-clipboard button with minimum 44x44px touch size.
- Readable, large-font code (18–24px recommended for visibility).

### Code Entry (Input field)
- Input field accepts only valid characters.
- Auto-hyphenates every 4 characters.
- Invalid input prompts real-time error feedback.

---

## 9. Developer Notes

### 9.1 Encoding Strategy Rationale
- **XOR Obfuscation:** Lightweight, fast, non-cryptographic.
- **Readable Character Set:** Improves accuracy (no I, O, 1, 0).
- **Hyphenation:** Easier error detection.
- **Versioning:** Ensures backward compatibility.

### 9.2 Performance Considerations
- **In-memory operations**; O(n) time complexity.

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
- Code visible on card detail screens.
- Copy-to-clipboard button (44x44px target size).
- Input field with auto-hyphenation.
- Invalid character prevention at input level.

---

## 5. Example

Input:
  "firstname": "Tadahiro",
  "surname": "Nomura",
  "country": "JP",
  "weightClass": 60,
  "signatureMoveId": 1234,
  "stats": {
    "power": 9,
    "speed": 8,
    "technique": 7,
    "kumikata": 6,
    "newaza": 5

Output: F7KP-WQ9M-ZD23-HYTR

## Tasks

- [ ] 1.0 Card Code Generation Function
  - [ ] 1.1 Validate input Judoka object for all required fields.
  - [ ] 1.2 Concatenate Judoka stats and key attributes into raw string.
  - [ ] 1.3 Apply XOR encoding with index-based key.
  - [ ] 1.4 Map encoded string to 32-character readable alphabet.
  - [ ] 1.5 Format string into chunks of 4 characters with hyphens.
  - [ ] 1.6 Return the final formatted code.
  - [ ] 1.7 Save the generated code into `judoka.json`.

- [ ] 2.0 Error Handling and Edge Cases
  - [ ] 2.1 Throw clear, standardized error if a field is missing or invalid.
  - [ ] 2.2 Fallback to a generic card code if encoding fails.
  - [ ] 2.3 Handle unusually large string input safely.

- [ ] 3.0 Performance Testing
  - [ ] 3.1 Benchmark code generation time on standard hardware.
  - [ ] 3.2 Optimize if generation exceeds 100ms.

- [ ] 4.0 UI Surface Interaction
  - [ ] 4.1 Ensure the generated code is visible on all card display screens.
  - [ ] 4.2 Support copy-to-clipboard functionality.
  - [ ] 4.3 Add input validation for code entry screens.
  - [ ] 4.4 Implement auto-hyphenation as players type shared codes.

- [ ] 5.0 Unit Tests
  - [ ] 5.1 Test valid Judoka object produces correct code format.
  - [ ] 5.2 Test invalid input triggers correct error fallback.
  - [ ] 5.3 Test same input always results in the same output code.
  - [ ] 5.4 Simulate edge cases like large inputs and validate fallback behavior.

- [ ] 6.0 Documentation
  - [ ] 6.1 Document encoding method, character map, fallback behavior.
  - [ ] 6.2 Document expected UX behavior (e.g., visible code on card view, copy functionality, input formatting).
