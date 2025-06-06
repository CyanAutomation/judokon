import * as path from "path";

/**
 * Path to the directory containing JSON data files.
 * Constructed using `path.join` to ensure consistent concatenation.
 *
 * @constant {string}
 */
export const DATA_DIR = path.join(".", "src", "data");
