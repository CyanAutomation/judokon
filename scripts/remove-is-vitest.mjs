#!/usr/bin/env node

/**
 * Script to remove IS_VITEST flag from codebase
 * 
 * This script:
 * 1. Removes IS_VITEST constant declarations
 * 2. Removes IS_VITEST guards around logging/debug code
 * 3. Updates forceDirectResolution logic to not depend on IS_VITEST
 * 4. Removes process.env.VITEST checks from test files
 * 5. Removes window.process.env.VITEST injection from Playwright helpers
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const changes = [];

async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf-8');
}

async function writeFile(filePath, content) {
  await fs.writeFile(filePath, content, 'utf-8');
}

function logChange(file, description) {
  changes.push({ file: path.relative(ROOT, file), description });
  console.log(`✓ ${path.relative(ROOT, file)}: ${description}`);
}

// Transform functions for each file

async function transformSelectionHandler() {
  const file = path.join(ROOT, 'src/helpers/classicBattle/selectionHandler.js');
  let content = await readFile(file);
  let modified = false;

  // Remove validation check at line 526
  const validationCheckPattern = /\n\s+if \(IS_VITEST\) \{\s+if \(store\.selectionMade !== true \|\| store\.playerChoice !== stat\) \{\s+throw new Error\(\s+`\[applySelectionToStore\] Store mutation failed: selectionMade=\$\{store\.selectionMade\}, playerChoice=\$\{store\.playerChoice\}`\s+\);\s+\}\s+logSelectionDebug\("\[applySelectionToStore\] AFTER:", \{\s+selectionMade: store\.selectionMade,\s+playerChoice: store\.playerChoice\s+\}\);\s+\}/;
  if (validationCheckPattern.test(content)) {
    content = content.replace(validationCheckPattern, '');
    modified = true;
    logChange(file, 'Removed IS_VITEST validation check in applySelectionToStore');
  }

  // Remove timer clearing block at line 697
  const timerClearingPattern = /\n\s+try \{\s+if \(IS_VITEST\) \{\s+try \{\s+scoreboard\.clearTimer\?\.\(\);\s+\} catch \{\}\s+clearNextRoundTimerFallback\(\);\s+try \{\s+const msg = document\.getElementById\("round-message"\);\s+if \(msg\) msg\.textContent = "";\s+\} catch \{\}\s+\/\/ Snackbar display is handled elsewhere based on resolution path\s+\}\s+\} catch \{\}/;
  if (timerClearingPattern.test(content)) {
    content = content.replace(timerClearingPattern, '\n  // Timer clearing and message display handled by event orchestrator');
    modified = true;
    logChange(file, 'Removed IS_VITEST timer clearing block');
  }

  // Update forceDirectResolution at line 797
  const forceDirectPattern = /const forceDirectResolution =\s+IS_VITEST && \(opts\.forceDirectResolution \|\| store\.forceDirectResolution\);/;
  if (forceDirectPattern.test(content)) {
    content = content.replace(
      forceDirectPattern,
      'const forceDirectResolution = opts.forceDirectResolution || store.forceDirectResolution;'
    );
    modified = true;
    logChange(file, 'Updated forceDirectResolution to not depend on IS_VITEST');
  }

  if (modified) {
    await writeFile(file, content);
  }
}

async function transformBattleLogger() {
  const file = path.join(ROOT, 'src/helpers/classicBattle/battleLogger.js');
  let content = await readFile(file);
  let modified = false;

  // Remove IS_VITEST constant
  const constantPattern = /\nconst IS_VITEST = typeof process !== "undefined" && !!process\.env\?\.VITEST;\n/;
  if (constantPattern.test(content)) {
    content = content.replace(constantPattern, '\n');
    modified = true;
    logChange(file, 'Removed IS_VITEST constant');
  }

  // Update JSDoc comment
  content = content.replace(
    / \* 1\. Accept enabled flag \(defaults to !IS_VITEST\)\./,
    ' * 1. Accept enabled flag (defaults to false for production).'
  );

  content = content.replace(
    / \* @param \{boolean\} \[enabled\] - Enable logging \(defaults to !IS_VITEST\)/,
    ' * @param {boolean} [enabled] - Enable logging (defaults to false)'
  );

  // Update function signature
  content = content.replace(
    /export function createBattleLogger\(enabled = !IS_VITEST\) \{/,
    'export function createBattleLogger(enabled = false) {'
  );

  if (content !== await readFile(file)) {
    await writeFile(file, content);
    logChange(file, 'Updated createBattleLogger to default enabled=false');
    modified = true;
  }

  return modified;
}

async function transformStateManager() {
  const file = path.join(ROOT, 'src/helpers/classicBattle/stateManager.js');
  let content = await readFile(file);
  let modified = false;

  // Remove IS_VITEST constant
  const constantPattern = /\nconst IS_VITEST = typeof process !== "undefined" && !!process\.env\?\.VITEST;\n/;
  if (constantPattern.test(content)) {
    content = content.replace(constantPattern, '\n');
    modified = true;
    logChange(file, 'Removed IS_VITEST constant');
  }

  // Remove IS_VITEST guard around console.error
  const guardPattern = /\s+if \(!IS_VITEST\) \{\s+(console\.error\([^)]+\);)\s+\}/g;
  if (guardPattern.test(content)) {
    content = content.replace(guardPattern, (match, consoleCall) => {
      return `      ${consoleCall}`;
    });
    modified = true;
    logChange(file, 'Removed IS_VITEST guard from console.error');
  }

  if (modified) {
    await writeFile(file, content);
  }
}

async function transformComputeNextRoundCooldown() {
  const file = path.join(ROOT, 'src/helpers/timers/computeNextRoundCooldown.js');
  let content = await readFile(file);
  let modified = false;

  // Remove IS_VITEST constant
  const constantPattern = /\nconst IS_VITEST = typeof process !== "undefined" && !!process\.env\?\.VITEST;\n/;
  if (constantPattern.test(content)) {
    content = content.replace(constantPattern, '\n');
    modified = true;
    logChange(file, 'Removed IS_VITEST constant');
  }

  // Remove IS_VITEST guard around console.log
  const guardPattern = /\s+if \(!IS_VITEST\) \{\s+(console\.log\([^)]+\);)\s+\}/g;
  if (guardPattern.test(content)) {
    content = content.replace(guardPattern, '');
    modified = true;
    logChange(file, 'Removed IS_VITEST guard from console.log');
  }

  if (modified) {
    await writeFile(file, content);
  }
}

async function transformScoreboardView() {
  const file = path.join(ROOT, 'src/components/ScoreboardView.js');
  let content = await readFile(file);
  let modified = false;

  // Remove IS_VITEST constant and its usage
  const isVitestBlock = /\s+const IS_VITEST = typeof process !== "undefined" && process\.env && process\.env\.VITEST;\s+if \(IS_VITEST\) \{\s+return;\s+\}/;
  if (isVitestBlock.test(content)) {
    content = content.replace(isVitestBlock, '\n      // Logging handled by debug utilities');
    modified = true;
    logChange(file, 'Removed IS_VITEST check and early return');
  }

  if (modified) {
    await writeFile(file, content);
  }
}

async function transformOpponentRevealTestSupport() {
  const file = path.join(ROOT, 'playwright/battle-classic/support/opponentRevealTestSupport.js');
  let content = await readFile(file);
  let modified = false;

  // Remove window.process.env.VITEST injection
  const vitestInjection = /\s+window\.process = \{ env: \{ VITEST: "1" \} \};/;
  if (vitestInjection.test(content)) {
    content = content.replace(vitestInjection, '');
    modified = true;
    logChange(file, 'Removed window.process.env.VITEST injection');
  }

  if (modified) {
    await writeFile(file, content);
  }
}

async function transformTestFiles() {
  const testFiles = [
    'tests/classicBattle/round-select.test.js',
    'tests/classicBattle/round-selectFallback.test.js',
    'tests/classicBattle/resolution.test.js',
    'tests/helpers/classicBattle/view.initHelpers.test.js',
    'tests/helpers/classicBattle/debugLogger.test.js'
  ];

  for (const relPath of testFiles) {
    const file = path.join(ROOT, relPath);
    try {
      let content = await readFile(file);
      const original = content;

      // Remove process.env.VITEST = "true" assignments
      content = content.replace(/\s+process\.env\.VITEST = ["']true["'];/g, '');
      
      // Remove process.env.VITEST checks
      content = content.replace(/\s+if \(!process\.env\.VITEST\) \{\s+process\.env\.VITEST = ["']true["'];\s+\}/g, '');
      
      // Remove console.log checking process.env.VITEST
      content = content.replace(/console\.log\(["']VITEST env at test top["'],\s*process\.env\.VITEST\);/g, '');
      
      // Remove originalVitest variable handling
      content = content.replace(/\s+const originalVitest = process\.env\.VITEST;/g, '');
      content = content.replace(/\s+const original = process\.env\.VITEST;/g, '');
      content = content.replace(/\s+delete process\.env\.VITEST;/g, '');
      content = content.replace(/\s+process\.env\.VITEST = originalVitest;/g, '');
      content = content.replace(/\s+process\.env\.VITEST = original;/g, '');
      
      // Update test descriptions
      content = content.replace(
        /it\(["']skips setup when process\.env\.VITEST is true["'],/,
        'it.skip("DEPRECATED: process.env.VITEST removed from codebase",'
      );

      if (content !== original) {
        await writeFile(file, content);
        logChange(file, 'Removed process.env.VITEST references');
      }
    } catch (err) {
      console.warn(`⚠ Skipping ${relPath}: ${err.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting IS_VITEST removal script...\n');

  try {
    await transformSelectionHandler();
    await transformBattleLogger();
    await transformStateManager();
    await transformComputeNextRoundCooldown();
    await transformScoreboardView();
    await transformOpponentRevealTestSupport();
    await transformTestFiles();

    console.log('\n✅ IS_VITEST removal complete!');
    console.log(`\n📝 Summary: ${changes.length} changes made:\n`);
    changes.forEach(({ file, description }) => {
      console.log(`  • ${file}: ${description}`);
    });

    console.log('\n🔍 Next steps:');
    console.log('  1. Run: npx eslint . --fix');
    console.log('  2. Run: npx prettier . --write');
    console.log('  3. Run targeted tests to verify changes');
    console.log('  4. Check for any remaining IS_VITEST references: grep -r "IS_VITEST" src/');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
