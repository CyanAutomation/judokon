const XOR_KEY = 37;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 readable characters
const CARD_CODE_VERSION = "v1";
/**
 * Encodes a string using XOR encryption.
 * @param str - The string to encode.
 * @param key - The XOR key (default is XOR_KEY).
 * @returns The XOR-encoded string.
 */
function xorEncode(str, key = XOR_KEY) {
    return str
        .split("")
        .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ (i + key) % 256))
        .join("");
}
/**
 * Converts a string into a readable charset using a predefined alphabet.
 * @param str - The string to convert.
 * @returns The string converted to the readable charset.
 */
function toReadableCharset(str) {
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
function chunk(str, size = 4) {
    var _a;
    if (typeof str !== "string" || !str.length)
        return "";
    return ((_a = str.match(new RegExp(`.{1,${size}}`, "g"))) === null || _a === void 0 ? void 0 : _a.join("-")) || "";
}
/**
 * Generates a unique, readable card code for a judoka.
 * @param judoka - The judoka object.
 * @returns The generated card code.
 */
export function generateCardCode(judoka) {
    var _a;
    if (!judoka ||
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
        typeof judoka.stats.neWaza === "undefined") {
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
        ((_a = judoka.signatureMoveId) === null || _a === void 0 ? void 0 : _a.toString()) || "",
        stats,
    ].join("-");
    const xor = xorEncode(raw);
    const readable = toReadableCharset(xor);
    return chunk(readable);
}
