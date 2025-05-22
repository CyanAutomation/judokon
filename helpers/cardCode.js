const XOR_KEY = 37;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 readable characters
const CARD_CODE_VERSION = "v1";

/**
 * Encodes a string using XOR encryption.
 *
 * Pseudocode:
 * 1. Split the input string `str` into an array of characters.
 *
 * 2. Map each character in the array to its XOR-encoded equivalent:
 *    - Get the ASCII code of the character using `charCodeAt(0)`.
 *    - Calculate the XOR value:
 *      a. Add the character's index (`i`) to the `key`.
 *      b. Take the result modulo 256 to ensure it fits within a byte.
 *      c. XOR the ASCII code with the calculated value.
 *    - Convert the XOR result back to a character using `String.fromCharCode`.
 *
 * 3. Join the encoded characters back into a single string.
 *
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
 * Pseudocode:
 * 1. Split the input string `str` into an array of characters.
 *
 * 2. Map each character in the array to a new character:
 *    - Get the character's ASCII code using `charCodeAt(0)`.
 *    - Calculate the index in the `ALPHABET` by taking the ASCII code modulo the length of the `ALPHABET`.
 *    - Replace the character with the corresponding character from the `ALPHABET`.
 *
 * 3. Join the mapped characters back into a single string.
 *
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
 * Pseudocode:
 * 1. Check if the input `str` is a valid string and has a length:
 *    - If `str` is not a string or is empty, return an empty string.
 *
 * 2. Use a regular expression to split the string into chunks:
 *    - Create a regex pattern that matches groups of up to `size` characters.
 *    - Use `str.match()` to find all matching chunks in the string.
 *
 * 3. Join the chunks with a delimiter (`-`):
 *    - If `str.match()` returns `null`, return an empty string.
 *    - Otherwise, join the chunks with a `-` delimiter.
 *
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
 * Pseudocode:
 * 1. Validate the `judoka` object:
 *    - Ensure all required fields are present:
 *      a. `name`, `surname`, `country`, `weightClass`, `signatureMoveId`.
 *      b. `stats` object with `power`, `speed`, `technique`, `kumiKata`, and `neWaza`.
 *    - If any required field is missing, throw an error.
 *
 * 2. Combine the judoka's stats into a single string:
 *    - Concatenate `power`, `speed`, `technique`, `kumiKata`, and `neWaza` values.
 *
 * 3. Construct the raw card code string:
 *    - Include the following fields, separated by dashes (`-`):
 *      a. `CARD_CODE_VERSION` (e.g., "v1").
 *      b. `name` (uppercase).
 *      c. `surname` (uppercase).
 *      d. `country` (uppercase).
 *      e. `weightClass`.
 *      f. `signatureMoveId` (converted to a string).
 *      g. The combined stats string.
 *
 * 4. Encode the raw card code string:
 *    - Use the `xorEncode` function to apply XOR encryption to the raw string.
 *
 * 5. Convert the encoded string into a readable charset:
 *    - Use the `toReadableCharset` function to map the encoded string to a predefined alphabet.
 *
 * 6. Split the readable string into chunks:
 *    - Use the `chunk` function to divide the string into chunks of 4 characters, separated by dashes (`-`).
 *
 * 7. Return the final chunked, readable card code.
 *
 * @param {Judoka} judoka - The judoka object.
 * @returns {string} The generated card code.
 * @throws {Error} If required fields are missing from the judoka object.
 */
export function generateCardCode(judoka) {
  if (
    !judoka ||
    !judoka.firstname ||
    !judoka.surname ||
    !judoka.country ||
    !judoka.weightClass ||
    !judoka.signatureMoveId ||
    !judoka.stats ||
    typeof judoka.stats.power === "undefined" ||
    typeof judoka.stats.speed === "undefined" ||
    typeof judoka.stats.technique === "undefined" ||
    typeof judoka.stats.kumikata === "undefined" ||
    typeof judoka.stats.newaza === "undefined"
  ) {
    throw new Error("Missing required judoka fields for card code generation.");
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
