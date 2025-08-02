import { readdir, writeFile } from "node:fs/promises";

const dir = new URL("../design/productRequirementsDocuments/", import.meta.url);

const files = (await readdir(dir))
  .filter((f) => f.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b));

await writeFile(new URL("prdIndex.json", dir), JSON.stringify(files, null, 2) + "\n");
