import { readdir, writeFile } from "node:fs/promises";

const dir = new URL("../design/productRequirementsDocuments/", import.meta.url);

/**
 * Recursively collect PRD markdown files relative to a directory URL.
 *
 * @param {URL} rootDir
 * @param {string} [prefix]
 * @returns {Promise<string[]>}
 */
async function collectPrdMarkdownFiles(rootDir, prefix = "") {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nestedPrefix = `${prefix}${entry.name}/`;
      const nestedFiles = await collectPrdMarkdownFiles(
        new URL(`${entry.name}/`, rootDir),
        nestedPrefix
      );
      files.push(...nestedFiles);
      continue;
    }

    const isPrdDoc = entry.name.startsWith("prd") && entry.name.endsWith(".md");
    if (isPrdDoc) files.push(`${prefix}${entry.name}`);
  }

  return files;
}

const files = (await collectPrdMarkdownFiles(dir)).sort((a, b) => a.localeCompare(b));

await writeFile(new URL("prdIndex.json", dir), JSON.stringify(files, null, 2) + "\n");
