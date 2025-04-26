const XOR_KEY = 37;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 readable characters
const CARD_CODE_VERSION = "v1";

/**
 * Encodes a string using XOR encryption.
 * @param {string} str - The string to encode.
 * @param {number} [key=XOR_KEY] - The XOR key (default is XOR_KEY).
 * @returns {string} The XOR-encoded string.
 */
function xorEncode(str, key = XOR_KEY) {
  return str
    .split("")
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ ((i + key) % 256)))
    .join("");
}

/**
 * Converts a string into a readable charset using a predefined alphabet.
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
 * @param {Object} judoka - The judoka object.
 * @returns {string} The generated card code.
 */
export function generateCardCode(judoka) {
  if (
    !judoka ||
    !judoka.name ||
    !judoka.surname ||
    !judoka.country ||
    !judoka.weightClass ||
    typeof judoka.signatureMoveId === "undefined" ||
    !judoka.stats ||
    typeof judoka.stats.power === "undefined" ||
    typeof judoka.stats.speed === "undefined" ||
    typeof judoka.stats.technique === "undefined" ||
    typeof judoka.stats.kumiKata === "undefined" ||
    typeof judoka.stats.neWaza === "undefined"
  ) {
    throw new Error("Missing required judoka fields for card code generation.");
  }

  const stats = [
    judoka.stats.power,
    judoka.stats.speed,
    judoka.stats.technique,
    judoka.stats.kumiKata,
    judoka.stats.neWaza,
  ].join("");

  const raw = [
    CARD_CODE_VERSION,
    judoka.name.toUpperCase(),
    judoka.surname.toUpperCase(),
    judoka.country.toUpperCase(),
    judoka.weightClass,
    judoka.signatureMoveId?.toString() || "",
    stats,
  ].join("-");

  const xor = xorEncode(raw);
  const readable = toReadableCharset(xor);
  return chunk(readable);
}