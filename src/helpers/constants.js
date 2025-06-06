/**
 * Path to the directory containing JSON data files.
 *
 * Using `import.meta.url` ensures the correct absolute URL is
 * generated regardless of which page imports this module. This
 * prevents broken relative paths when pages are nested within the
 * project directory structure.
 *
 * @constant {string}
 */
export const DATA_DIR = new URL("../data/", import.meta.url).href;
