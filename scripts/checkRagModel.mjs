/**
 * @fileoverview Script to verify the presence and integrity of local RAG model files.
 * This script is intended to be run as a pre-commit hook or a CI check.
 */

import { stat } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..'); // Adjust if script is not directly in 'scripts'

const modelDir = resolve(rootDir, 'src', 'models', 'minilm');
const requiredFiles = [
  'config.json',
  'tokenizer_config.json',
  'tokenizer.json',
  'onnx/model_quantized.onnx',
];

async function checkRagModel() {
  let allFilesPresent = true;
  console.log(`Verifying local RAG model in: ${modelDir}`);

  for (const file of requiredFiles) {
    const filePath = resolve(modelDir, file);
    try {
      await stat(filePath);
      console.log(`  ✅ Found: ${file}`);
    } catch (error) {
      console.error(`  ❌ Missing: ${file}`);
      allFilesPresent = false;
    }
  }

  if (!allFilesPresent) {
    console.error(
      'RAG model files are missing or incomplete. Please run `npm run rag:prepare:models` to download them.'
    );
    process.exit(1);
  } else {
    console.log('All local RAG model files are present and accounted for.');
    process.exit(0);
  }
}

checkRagModel().catch((error) => {
  console.error('An unexpected error occurred during RAG model check:', error);
  process.exit(1);
});
