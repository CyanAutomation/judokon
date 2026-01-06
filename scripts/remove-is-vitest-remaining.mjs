#!/usr/bin/env node

/**
 * Second pass: Remove remaining IS_VITEST references
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function main() {
  console.log('🔧 Removing remaining IS_VITEST references...\n');

  const files = [
    'src/helpers/battle/battleUI.js',
    'src/helpers/classicBattle/roundUI.js',
    'src/helpers/classicBattle/stateManager.js',
    'src/helpers/timers/computeNextRoundCooldown.js'
  ];

  for (const relPath of files) {
    const file = path.join(ROOT, relPath);
    let content = await fs.readFile(file, 'utf-8');
    const original = content;

    // Remove IS_VITEST constant declaration
    content = content.replace(
      /const IS_VITEST = typeof process !== "undefined" && !!process\.env\?\.VITEST;\n\n/g,
      ''
    );

    // Remove single-line IS_VITEST guards
    content = content.replace(/\s+if \(!IS_VITEST\)\s+/g, '\n    // ');
    content = content.replace(/\s+if \(IS_VITEST\) return;\n/g, '\n    // Debug logging disabled\n');

    // Remove multi-line IS_VITEST guards
    content = content.replace(/\s+if \(!IS_VITEST\) \{\n\s+(.+?)\n\s+\}/gs, (match, inner) => {
      return '\n    // ' + inner.trim();
    });

    if (content !== original) {
      await fs.writeFile(file, content, 'utf-8');
      console.log(`✓ ${relPath}`);
    }
  }

  console.log('\n✅ Cleanup complete!');
  console.log('\n🔍 Verifying...');
  
  // Count remaining IS_VITEST references
  const { spawn } = await import('child_process');
  const proc = spawn('grep', ['-r', 'IS_VITEST', 'src/', '--include=*.js'], {
    cwd: ROOT
  });
  
  let output = '';
  proc.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  proc.on('close', (code) => {
    if (code === 0 && output.trim()) {
      console.log('\n⚠️  Remaining IS_VITEST references found:');
      console.log(output);
    } else {
      console.log('\n✅ No IS_VITEST references remaining in src/');
    }
  });
}

main().catch(console.error);
