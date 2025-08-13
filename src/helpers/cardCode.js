import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";

const XOR_KEY = 37;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 readable characters
const CARD_CODE_VERSION = "v1";

/**
 * Encodes a string using XOR encryption.
 *
 * @pseudocode
 * 1. Split the input string `str` into an array of characters.
 * 2. For each character:
 *    - Get its ASCII code using `charCodeAt(0)`.
 *    - Calculate the XOR value:
 *      a. Add the character's index (`i`) to the `key`.
 *      b. Take the result modulo 256 to ensure it fits within a byte.
 *      c. XOR the ASCII code with the calculated value.
 *    - Convert the XOR result back to a character using `String.fromCharCode`.
 * 3. Combine the encoded characters into a single string.
 * 4. Return the XOR-encoded string.
 *
 * @param {string} str - The string to encode.
 * @param {number} [key=XOR_KEY] - The XOR key (default is XOR_KEY).
 * @returns {string} The XOR-encoded string.
 */
function xorEncode(str, key = XOR_KEY) {
  return str
    .split("")
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ (i + key) % 256))
    .join("");
}

/**
 * Converts a string into a readable charset using a predefined alphabet.
 *
 * @pseudocode
 * 1. Split the input string `str` into an array of characters.
 * 2. For each character:
 *    - Get its ASCII code using `charCodeAt(0)`.
 *    - Calculate the index in the `ALPHABET` by taking the ASCII code modulo the length of the `ALPHABET`.
 *    - Replace the character with the corresponding character from the `ALPHABET`.
 * 3. Combine the mapped characters into a single string.
 * 4. Return the resulting string.
 *
 * @param {string} str - The string to convert.
 * @returns {string} The string converted to the readable charset.
 */
function toReadableCharset(str) {
  return str
    .split("")
    .map((c) => ALPHABET[c.charCodeAt(0) % ALPHABET.length])
    .join("");
}

/**
 * Splits a string into chunks of a specified size and joins them with a delimiter.
 *
 * @pseudocode
 * 1. Validate the input `str`:
 *    - Ensure `str` is a non-empty string.
 *    - If invalid, return an empty string.
 * 2. Use a regular expression to split the string into chunks:
 *    - Match groups of up to `size` characters.
 *    - If no matches are found, return an empty string.
 * 3. Combine the chunks using the `-` delimiter.
 * 4. Return the chunked string.
 *
 * @param {string} str - The string to chunk.
 * @param {number} [size=4] - The size of each chunk (default is 4).
 * @returns {string} The chunked string.
 */
function chunk(str, size = 4) {
  if (typeof str !== "string" || !str.length) return "";
  return str.match(new RegExp(`.{1,${size}}`, "g"))?.join("-") || "";
}

/**
 * Generates a unique, readable card code for a judoka.
 *
 * @pseudocode
 * 1. Validate the `judoka` object:
 *    - Ensure all required fields are present:
 *      a. `firstname`, `surname`, `country`, `weightClass`, `signatureMoveId`.
 *      b. `stats` object with `power`, `speed`, `technique`, `kumikata`, and `newaza`.
 *    - Throw an error if any required field is missing.
 * 2. Combine the judoka's stats into a single string:
 *    - Concatenate `power`, `speed`, `technique`, `kumikata`, and `newaza` values.
 * 3. Construct the raw card code string:
 *    - Include the following fields, separated by dashes (`-`):
 *      a. `CARD_CODE_VERSION`.
 *      b. `firstname` (uppercase).
 *      c. `surname` (uppercase).
 *      d. `country` (uppercase).
 *      e. `weightClass`.
 *      f. `signatureMoveId` (converted to a string).
 *      g. The combined stats string.
 * 4. Encode the raw card code string:
 *    - Use the `xorEncode` function to apply XOR encryption.
 * 5. Convert the encoded string into a readable charset:
 *    - Use the `toReadableCharset` function to map the encoded string to the `ALPHABET`.
 * 6. Split the readable string into chunks:
 *    - Use the `chunk` function to divide the string into chunks of 4 characters, separated by dashes (`-`).
 * 7. Return the final chunked, readable card code.
 *
 * @param {Judoka} judoka - The judoka object.
 * @returns {string} The generated card code.
 * @throws {Error} If required fields are missing from the judoka object.
 */
export function generateCardCode(judoka) {
  const missing = getMissingJudokaFields(judoka);
  if (!hasRequiredJudokaFields(judoka)) {
    throw new Error(
      `Missing required judoka fields for card code generation: ${missing.join(", ")}`
    );
  }

  const stats = [
    judoka.stats.power,
    judoka.stats.speed,
    judoka.stats.technique,
    judoka.stats.kumikata,
    judoka.stats.newaza
  ].join("");

  const raw = [
    CARD_CODE_VERSION,
    judoka.firstname.toUpperCase(),
    judoka.surname.toUpperCase(),
    judoka.country.toUpperCase(),
    judoka.weightClass,
    judoka.signatureMoveId?.toString() || "",
    stats
  ].join("-");

  const xor = xorEncode(raw);
  const readable = toReadableCharset(xor);
  return chunk(readable);
}
