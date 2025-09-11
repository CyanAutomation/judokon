#!/usr/bin/env node
/**
 * Console Pattern Audit Script
 *
 * Analyzes test files to identify console handling patterns and create
 * a migration guide for standardizing on withMutedConsole() utilities.
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import path from "path";

// Pattern detection
const patterns = {
  rawConsoleSpying: /vi\.spyOn\(console,\s*['"`](\w+)['"`]\)/g,
  withMutedConsole: /withMutedConsole\(/g,
  withAllowedConsole: /withAllowedConsole\(/g,
  mockImplementation: /\.mockImplementation\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g
};

async function auditConsolePatterns() {
  const testFiles = await glob("tests/**/*.test.js");
  const results = {
    summary: {
      totalFiles: 0,
      filesWithRawSpying: 0,
      filesWithProperMuting: 0,
      rawSpyingInstances: 0,
      properMutingInstances: 0
    },
    fileDetails: [],
    migrationCandidates: []
  };

  for (const file of testFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      const relativePath = path.relative(process.cwd(), file);

      const rawSpyMatches = Array.from(content.matchAll(patterns.rawConsoleSpying));
      const mutedConsoleMatches = Array.from(content.matchAll(patterns.withMutedConsole));
      const allowedConsoleMatches = Array.from(content.matchAll(patterns.withAllowedConsole));

      results.summary.totalFiles++;

      if (rawSpyMatches.length > 0) {
        results.summary.filesWithRawSpying++;
        results.summary.rawSpyingInstances += rawSpyMatches.length;
      }

      if (mutedConsoleMatches.length > 0 || allowedConsoleMatches.length > 0) {
        results.summary.filesWithProperMuting++;
        results.summary.properMutingInstances +=
          mutedConsoleMatches.length + allowedConsoleMatches.length;
      }

      const fileDetail = {
        file: relativePath,
        rawSpying: rawSpyMatches.map((match) => ({
          method: match[1],
          line: content.substring(0, match.index).split("\n").length
        })),
        properMuting: {
          withMuted: mutedConsoleMatches.length,
          withAllowed: allowedConsoleMatches.length
        }
      };

      results.fileDetails.push(fileDetail);

      // Add to migration candidates if has raw spying
      if (rawSpyMatches.length > 0) {
        results.migrationCandidates.push({
          file: relativePath,
          instances: rawSpyMatches.length,
          methods: [...new Set(rawSpyMatches.map((m) => m[1]))]
        });
      }
    } catch (error) {
      console.warn(`Failed to analyze ${file}: ${error.message}`);
    }
  }

  return results;
}

function generateMigrationGuide(auditResults) {
  const guide = `# Console Handling Migration Guide

## Audit Results

- **Total test files analyzed**: ${auditResults.summary.totalFiles}
- **Files using raw console spying**: ${auditResults.summary.filesWithRawSpying}
- **Files using proper muting utilities**: ${auditResults.summary.filesWithProperMuting}
- **Raw spying instances**: ${auditResults.summary.rawSpyingInstances}
- **Proper muting instances**: ${auditResults.summary.properMutingInstances}

## Migration Priority Files

${auditResults.migrationCandidates
  .sort((a, b) => b.instances - a.instances)
  .slice(0, 10)
  .map((file) => `- **${file.file}**: ${file.instances} instances (${file.methods.join(", ")})`)
  .join("\n")}

## Standard Patterns

### ❌ Current Raw Spying Pattern (To Be Replaced)
\`\`\`javascript
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
// ... test code
errorSpy.mockRestore();
\`\`\`

### ✅ Preferred Muting Pattern
\`\`\`javascript
import { withMutedConsole } from "../utils/console.js";

await withMutedConsole(async () => {
  // Test code that would normally error/warn
});
\`\`\`

### ✅ Expected Console Pattern
\`\`\`javascript
import { withAllowedConsole } from "../utils/console.js";

await withAllowedConsole(async () => {
  // Test code where specific warnings/errors are expected
});
\`\`\`

## Migration Commands

### Individual File Migration
\`\`\`bash
# Replace raw spying pattern
sed -i 's/vi\\.spyOn(console, "error")\\.mockImplementation(() => {})/withMutedConsole/g' tests/path/to/file.test.js
\`\`\`

### Bulk Migration (Top 10 Files)
${auditResults.migrationCandidates
  .slice(0, 10)
  .map((file) => `# ${file.file}\nnpm run test -- ${file.file} --reporter=verbose`)
  .join("\n")}
`;

  return guide;
}

// Run audit and generate guide
async function main() {
  console.log("🔍 Auditing console patterns in test files...");

  const auditResults = await auditConsolePatterns();

  console.log(`\n📊 Audit Results:`);
  console.log(`   Total files: ${auditResults.summary.totalFiles}`);
  console.log(
    `   Raw spying: ${auditResults.summary.rawSpyingInstances} instances in ${auditResults.summary.filesWithRawSpying} files`
  );
  console.log(
    `   Proper muting: ${auditResults.summary.properMutingInstances} instances in ${auditResults.summary.filesWithProperMuting} files`
  );

  const guide = generateMigrationGuide(auditResults);

  // Write guide to file
  writeFileSync("console-migration-guide.md", guide);
  console.log(`\n✅ Migration guide written to console-migration-guide.md`);

  // Write raw audit data
  writeFileSync("console-audit-results.json", JSON.stringify(auditResults, null, 2));
  console.log(`✅ Detailed audit results written to console-audit-results.json`);

  return auditResults;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { auditConsolePatterns, generateMigrationGuide };
