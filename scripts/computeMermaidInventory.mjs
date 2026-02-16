#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const targetDir = path.join("design", "productRequirementsDocuments");
const mermaidFence = /^```mermaid\s*$/gm;

const entries = await readdir(targetDir, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => path.join(targetDir, entry.name))
  .sort();

let filesWithMermaid = 0;
let totalMermaidBlocks = 0;
const perFile = [];

for (const filePath of files) {
  const content = await readFile(filePath, "utf8");
  const blockCount = (content.match(mermaidFence) || []).length;
  if (blockCount > 0) {
    filesWithMermaid += 1;
  }
  totalMermaidBlocks += blockCount;
  perFile.push({ file: filePath, mermaidBlocks: blockCount });
}

const result = {
  scope: `${targetDir}/*.md`,
  totalPrdFiles: files.length,
  filesWithMermaid,
  filesWithoutMermaid: files.length - filesWithMermaid,
  totalMermaidBlocks,
  generatedAt: new Date().toISOString(),
  perFile
};

console.log(JSON.stringify(result, null, 2));
