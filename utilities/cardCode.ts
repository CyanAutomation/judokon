interface Stats {
  power: number;
  speed: number;
  technique: number;
  kumikata: number;
  newaza: number;
}

interface Judoka {
  firstname: string;
  surname: string;
  countryCode: string;
  weightClass: string;
  signatureMoveId: number;
  stats: Stats;
}

const XOR_KEY: number = 37
const ALPHABET: string = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // 32 readable characters
const CARD_CODE_VERSION: string = "v1"

function xorEncode(str: string, key: number = XOR_KEY): string {
  return str
    .split("")
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ (i + key) % 256))
    .join("")
}

function toReadableCharset(str: string): string {
  return str
    .split("")
    .map((c) => ALPHABET[c.charCodeAt(0) % ALPHABET.length])
    .join("")
}

function chunk(str: string, size: number = 4): string {
  if (typeof str !== "string" || !str.length) return ""
  return str.match(new RegExp(`.{1,${size}}`, "g")).join("-")
}

/**
 * Generates a unique, readable card code for a judoka.
 * @param {Object} judoka - The judoka object.
 * @returns {string} The generated card code.
 */
export function generateCardCode(judoka: Judoka): string {
  if (
    !judoka ||
    !judoka.firstname ||
    !judoka.surname ||
    !judoka.countryCode ||
    !judoka.weightClass ||
    typeof judoka.signatureMoveId === "undefined" ||
    !judoka.stats ||
    typeof judoka.stats.power === "undefined" ||
    typeof judoka.stats.speed === "undefined" ||
    typeof judoka.stats.technique === "undefined" ||
    typeof judoka.stats.kumikata === "undefined" ||
    typeof judoka.stats.newaza === "undefined"
  ) {
    throw new Error("Missing required judoka fields for card code generation.")
  }

  const stats = [
    judoka.stats.power,
    judoka.stats.speed,
    judoka.stats.technique,
    judoka.stats.kumikata,
    judoka.stats.newaza,
  ].join("")

  const raw = [
    CARD_CODE_VERSION,
    judoka.firstname.toUpperCase(),
    judoka.surname.toUpperCase(),
    judoka.countryCode.toUpperCase(),
    judoka.weightClass,
    judoka.signatureMoveId.toString(),
    stats,
  ].join("-")

  const xor = xorEncode(raw)
  const readable = toReadableCharset(xor)
  return chunk(readable)
}
