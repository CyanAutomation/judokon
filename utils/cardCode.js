const XOR_KEY = 37;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 readable characters

function xorEncode(str, key = XOR_KEY) {
  return str
    .split('')
    .map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ ((i + key) % 256))
    )
    .join('');
}

function toReadableCharset(str) {
  return str
    .split('')
    .map(c => ALPHABET[c.charCodeAt(0) % ALPHABET.length])
    .join('');
}

function chunk(str, size = 4) {
  return str.match(new RegExp(`.{1,${size}}`, 'g')).join('-');
}

export function generateCardCode(judoka) {
  const version = 'v1';
  const stats = [
    judoka.stats.power,
    judoka.stats.speed,
    judoka.stats.technique,
    judoka.stats.kumikata,
    judoka.stats.newaza
  ].join('');

  const raw = [
    version,
    judoka.firstname.toUpperCase(),
    judoka.surname.toUpperCase(),
    judoka.countryCode.toUpperCase(),
    judoka.weightClass, // Keep -/+ intact
    judoka.signatureMoveId,
    stats
  ].join('-');

  const xor = xorEncode(raw);
  const readable = toReadableCharset(xor);
  return chunk(readable);
}