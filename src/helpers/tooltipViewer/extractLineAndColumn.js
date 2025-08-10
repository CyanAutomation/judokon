/**
 * Extract line and column numbers from a JSON parse error.
 *
 * @pseudocode
 * 1. Run a regex on `error.message` to capture `line` and `column` digits.
 * 2. When both numbers exist, return them as an object.
 * 3. Otherwise, attempt to parse a position and return it as `column`.
 * 4. If no numbers can be found, return `null`.
 *
 * @param {SyntaxError} error - SyntaxError thrown during JSON parsing.
 * @returns {{ line: number|null, column: number|null } | null} Parsed line/column or `null`.
 */
export function extractLineAndColumn(error) {
  const message = error?.message ?? "";
  let match = /line (\d+)[^\d]+column (\d+)/i.exec(message);
  if (match) {
    return { line: Number(match[1]), column: Number(match[2]) };
  }
  match = /at line (\d+)[^\d]+column (\d+)/i.exec(message);
  if (match) {
    return { line: Number(match[1]), column: Number(match[2]) };
  }
  match = /at position (\d+)/i.exec(message);
  if (match) {
    return { line: null, column: Number(match[1]) };
  }
  match = /in JSON at position (\d+)/i.exec(message);
  if (match) {
    return { line: null, column: Number(match[1]) };
  }
  return null;
}
