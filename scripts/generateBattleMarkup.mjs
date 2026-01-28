import { readFile, writeFile } from "node:fs/promises";

const jsonPath = new URL("../design/dataSchemas/battleMarkup.json", import.meta.url);
const outputPath = new URL(
  "../design/dataSchemas/battleMarkup.generated.js",
  import.meta.url
);

const raw = await readFile(jsonPath, "utf8");
const data = JSON.parse(raw);

const output = `// Generated from design/dataSchemas/battleMarkup.json. Do not edit by hand.\nexport default ${JSON.stringify(
  data,
  null,
  2
)};\n`;

await writeFile(outputPath, output, "utf8");
