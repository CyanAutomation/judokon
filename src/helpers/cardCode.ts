import { Judoka } from "../types";

const XOR_KEY: number = 37;
const ALPHABET: string = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 readable characters
const CARD_CODE_VERSION: string = "v1";

/**
 * Encodes a string using XOR encryption.
 * @param str - The string to encode.
 * @param key - The XOR key (default is XOR_KEY).
 * @returns The XOR-encoded string.
 */
function xorEncode(str: string, key: number = XOR_KEY): string {
  return str
    .split("")
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ ((i + key) % 256)))
    .join("");
}

/**
 * Converts a string into a readable charset using a predefined alphabet.
 * @param str - The string to convert.
 * @returns The string converted to the readable charset.
 */
function toReadableCharset(str: string): string {
  return str
    .split("")
    .map((c) => ALPHABET[c.charCodeAt(0) % ALPHABET.length])
    .join("");
}

/**
 * Splits a string into chunks of a specified size and joins them with a delimiter.
 * @param str - The string to chunk.
 * @param size - The size of each chunk (default is 4).
 * @returns The chunked string.
 */
function chunk(str: string, size: number = 4): string {
  if (typeof str !== "string" || !str.length) return "";
  return str.match(new RegExp(`.{1,${size}}`, "g"))?.join("-") || "";
}

/**
 * Generates a unique, readable card code for a judoka.
 * @param judoka - The judoka object.
 * @returns The generated card code.
 */
export function generateCardCode(judoka: Judoka): string {
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