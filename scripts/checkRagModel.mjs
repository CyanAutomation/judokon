/**
 * @fileoverview Script to verify the presence and integrity of local RAG model files.
 * This script is intended to be run as a pre-commit hook or a CI check.
 */

import { stat } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, ".."); // Adjust if script is not directly in 'scripts'

const modelDir = resolve(rootDir, "models", "minilm");
const requiredFiles = [
  "config.json",
  "tokenizer_config.json",
  "tokenizer.json",
  "onnx/model_quantized.onnx"
];

async function checkRagModel() {
  let allFilesPresent = true;
  console.log(`Verifying local MiniLM model in: ${modelDir}`);

  for (const file of requiredFiles) {
    const filePath = resolve(modelDir, file);
    try {
      await stat(filePath);
      console.log(`  ✅ Found: ${file}`);
    } catch {
      console.error(`  ❌ Missing: ${file}`);
      allFilesPresent = false;
    }
  }

  if (!allFilesPresent) {
    console.error(
      "MiniLM assets are missing under models/minilm. Run `npm run rag:prepare:models` to hydrate them."
    );
    process.exit(1);
  } else {
    console.log("All required MiniLM assets exist under models/minilm.");
    process.exit(0);
  }
}

checkRagModel().catch((error) => {
  console.error("An unexpected error occurred during RAG model check:", error);
  process.exit(1);
});
