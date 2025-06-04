

⸻

JU-DO-KON! – Card Code Generation Function: Product Requirements Document (PRD)

⸻

1. Overview

This document defines the specifications for the Card Code Generation Function in the JU-DO-KON! web-based card game.

The Card Code Generation Function transforms key attributes of a Judoka (player card) into a unique, readable alphanumeric code. This code can be used for sharing, recreating, or validating specific Judoka cards in the game. Players feel a sense of ownership and pride by easily sharing their creations, and a lack of content sharing can lead to lower engagement.

The system ensures that:
	•	The code is unique to each Judoka’s stats and identity.
	•	The code is obfuscated to prevent easy manipulation.
	•	The code is readable, using a limited, friendly character set.
	•	The code is formatted for ease of reading and entry.

The most important factors are security (obfuscated to prevent easy manipulation) and usability.
	•	100ms maximum generation time for producing the card code.
	•	The card code is auto-generated whenever a card is created or updated and saved into judoka.json.
	•	The card code is made visible to the player on any screen where a card is displayed.
	•	Players should be able to input shared codes with a <2% manual entry error rate.
	•	In the UI, the code should support easy copying and input validation, including auto-hyphenation during code entry for better usability.

⸻

2. Purpose and Value
	•	For Players: Allows players to easily share and import/export custom Judoka using compact codes.
	•	For the Game: Adds a layer of authenticity and integrity by encoding important Judoka attributes securely.
	•	For Developers: Simplifies storage and retrieval of Judoka data without exposing raw stats or player data.

⸻

3. Functional Requirements

Priority
Feature
Description
P1
Input Validation
Ensure all required Judoka fields are present and valid.
P1
String Concatenation
Build the raw code string from Judoka attributes and stats.
P1
XOR Obfuscation
Apply XOR encoding to obfuscate the raw string.
P1
Readable Charset Mapping
Convert to a friendly alphanumeric code using the specified 32-character set.
P1
Chunk Formatting
Format final code into 4-character chunks separated by hyphens.
P1
Save to File
Persist the generated code in judoka.json for use in the UI.
P2
Error Handling
Provide clear error messages or fallback to a generic code on failure.
P2
UI Surfacing
Display generated code and support copy/paste and auto-formatting UX.
P2
Performance Compliance
Ensure code generation completes in under 100ms.

⸻

3.2 Process (P1)
	1.	Concatenate Stats
	•	Combine power, speed, technique, kumikata, and newaza into a single string.
	2.	Build Raw Code String
	•	Format:

v1-FIRSTNAME-SURNAME-COUNTRY-WEIGHTCLASS-SIGNATUREMOVEID-STATS

Example:

v1-TADAHIRO-NOMURA-JP-60-1234-98765


	3.	Apply XOR Encoding
	•	XOR each character’s ASCII code with (index + 37) % 256 to obfuscate the string.
	4.	Map to Readable Charset
	•	Convert each encoded character to one of 32 readable characters:

ABCDEFGHJKLMNPQRSTUVWXYZ23456789


	•	Avoids confusing characters (e.g., no I, O, 1, 0).

	5.	Chunking
	•	Group the resulting string into chunks of 4 characters, separated by hyphens (-).
	6.	Output
	•	A hyphen-separated, readable, obfuscated card code (e.g., ABCD-EFGH-1234-5678).

⸻

3.3 Output (P1)
	•	Card Code: A string of alphanumeric characters (A-Z, 2–9), grouped in sets of 4 with hyphens, e.g.:

F7KP-WQ9M-ZD23-HYTR



⸻

4. Non-Functional Requirements
	•	Readability: Only user-friendly characters are used (no ambiguous characters).
	•	Security: Light obfuscation prevents easy decoding without internal knowledge of the XOR key and mapping.
	•	Error Handling: If required fields are missing, return a clear, standardized error message.
	•	Performance: Must process and generate a code within 100 milliseconds.
	•	Consistency: The same input must always generate the same code.

⸻

5. Example

Input:

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
    "kumikata": 6,
    "newaza": 5
  }
}

Output:

F7KP-WQ9M-ZD23-HYTR


⸻

6. Acceptance Criteria

ID	Criterion	Pass/Fail
AC1	If all required fields are present, a code is generated	
AC2	Missing any required field causes a clear, standardized error	
AC3	The code is readable, only using A–Z, 2–9, and hyphens	
AC4	The code groups characters in chunks of 4 with hyphens	
AC5	The same Judoka object always generates the same code	
AC6	Generating a code for a Judoka completes in under 100ms	
AC7	Player manual input error rate remains under 2%	


⸻

7. Edge Cases / Failure States (P2)
	•	Very large strings/malicious input (e.g., a 5000-character name).
	•	Potential collisions in the code.
	•	Encoding logic failure (e.g., memory issues).
	•	No server timeout or generation timeout consideration.

Fallback: In case of any failure, fallback to a generic card code indicating failure.

⸻

8. Wireframe

(Not applicable — function is backend logic; no visual output beyond the code string.)

⸻

9. Developer Notes

9.1 Encoding Strategy Rationale
	•	XOR Obfuscation: Offers a lightweight method fast and reversible at low cost. It’s not cryptographic security but sufficient to deter casual reverse-engineering.
	•	Readable Character Set:
	•	ABCDEFGHJKLMNPQRSTUVWXYZ23456789
	•	Improves readability and minimizes errors (no O, 0, I, 1).
	•	Hyphenated Chunking:
	•	Chunks of 4 characters improve readability and error detection.
	•	Follows conventions used in serial numbers and license keys.
	•	Versioning (CARD_CODE_VERSION):
	•	Enables future-proofing and backward compatibility.

9.2 Performance Considerations
	•	In-Memory Operations: No disk I/O ensures real-time performance.
	•	Time Complexity: Each transformation is O(n), manageable due to small input size (~50–70 characters).

9.3 Limitations
	•	Security: XOR is not cryptographic-grade.
	•	Uniqueness: No cryptographic collision-proof guarantees.
	•	No Decoding: Prevents tampering by avoiding reversible decoding.

9.4 Potential Enhancements
	•	Customizable chunk size for different platforms.
	•	Add a checksum digit to catch manual entry errors.
	•	Admin-only decode function for tournament verification.
	•	Introduce a salt/nonce to further reduce collision chances.

9.5 UI Input Considerations (P2)
	•	The code should be displayed clearly on card detail screens.
	•	Support copy-to-clipboard on click/tap.
	•	Input fields for code entry should:
	•	Accept only valid characters.
	•	Auto-hyphenate after every 4 characters during typing for better UX, especially on mobile.

⸻

## Tasks

- [ ] 1.0 Card Code Generation Function
  - [ ] 1.1 Validate input Judoka object for all required fields.
  - [ ] 1.2 Concatenate Judoka stats and key attributes into raw string.
  - [ ] 1.3 Apply XOR encoding with index-based key.
  - [ ] 1.4 Map encoded string to 32-character readable alphabet.
  - [ ] 1.5 Format string into chunks of 4 characters with hyphens.
  - [ ] 1.6 Return the final formatted code.
  - [ ] 1.7 Save the generated code into judoka.json.

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
