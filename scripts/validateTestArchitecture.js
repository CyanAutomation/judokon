#!/usr/bin/env node

/**
 * Validate test architecture patterns across the codebase
 * Checks for anti-patterns and suggests improvements
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ANTI_PATTERNS = {
  manualDomForComplex: {
    pattern: /document\.body\.innerHTML.*=.*['"`].*(<.*>.*){3,}/,
    message: 'Complex manual DOM detected - consider using real HTML for integration tests',
    severity: 'warning'
  },
  missingCleanup: {
    pattern: /createRealHtmlTestEnvironment\(\)/,
    requiresPattern: /cleanup\(\)/,
    message: 'Real HTML test environment created but cleanup() not found',
    severity: 'error'
  },
  inconsistentNaming: {
    pattern: /describe\(['"`][^'"`]*['"`]/,
    message: 'Consider using consistent naming: Component (Unit|DOM|Integration)',
    severity: 'info'
  }
};

const GOOD_PATTERNS = {
  realHtmlUtils: /createRealHtmlTestEnvironment|validateRealHtmlStructure/,
  properCleanup: /afterEach.*cleanup/,
  clearNaming: /describe\(['"`][^'"`]*\s*\((Unit|DOM|Integration)\)/
};

function findTestFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules')) {
      findTestFiles(fullPath, files);
    } else if (item.endsWith('.test.js') || item.endsWith('.spec.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function analyzeTestFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const results = {
    file: filePath,
    issues: [],
    goodPatterns: [],
    score: 0
  };
  
  // Check for anti-patterns
  for (const [name, config] of Object.entries(ANTI_PATTERNS)) {
    if (config.pattern.test(content)) {
      if (config.requiresPattern && !config.requiresPattern.test(content)) {
        results.issues.push({
          type: name,
          message: config.message,
          severity: config.severity
        });
      } else if (!config.requiresPattern) {
        results.issues.push({
          type: name,
          message: config.message,
          severity: config.severity
        });
      }
    }
  }
  
  // Check for good patterns
  for (const [name, pattern] of Object.entries(GOOD_PATTERNS)) {
    if (pattern.test(content)) {
      results.goodPatterns.push(name);
      results.score += 1;
    }
  }
  
  // Calculate score (good patterns - issues)
  results.score -= results.issues.filter(i => i.severity === 'error').length * 2;
  results.score -= results.issues.filter(i => i.severity === 'warning').length * 1;
  
  return results;
}

function generateReport(results) {
  console.log('🧪 Test Architecture Validation Report\n');
  
  const totalFiles = results.length;
  const filesWithIssues = results.filter(r => r.issues.length > 0).length;
  const filesWithGoodPatterns = results.filter(r => r.goodPatterns.length > 0).length;
  
  console.log(`📊 Summary:`);
  console.log(`  Total test files: ${totalFiles}`);
  console.log(`  Files with issues: ${filesWithIssues}`);
  console.log(`  Files with good patterns: ${filesWithGoodPatterns}`);
  console.log(`  Architecture compliance: ${Math.round((1 - filesWithIssues / totalFiles) * 100)}%\n`);
  
  // Show files with issues
  const filesWithProblems = results.filter(r => r.issues.length > 0);
  if (filesWithProblems.length > 0) {
    console.log('⚠️  Files with architecture issues:\n');
    
    filesWithProblems.forEach(result => {
      console.log(`📄 ${result.file.replace(process.cwd(), '.')}`);
      result.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${issue.message}`);
      });
      console.log();
    });
  }
  
  // Show files with good patterns
  const filesWithGoodStuff = results.filter(r => r.goodPatterns.length > 0);
  if (filesWithGoodStuff.length > 0) {
    console.log('✅ Files following good patterns:\n');
    
    filesWithGoodStuff.slice(0, 5).forEach(result => {
      console.log(`📄 ${result.file.replace(process.cwd(), '.')} (score: ${result.score})`);
      result.goodPatterns.forEach(pattern => {
        console.log(`  ✅ Uses ${pattern}`);
      });
      console.log();
    });
  }
  
  console.log('📖 See tests/TESTING_ARCHITECTURE.md for guidelines');
}

// Main execution
const testFiles = findTestFiles(join(process.cwd(), 'tests'));
const results = testFiles.map(analyzeTestFile);

generateReport(results);

// Exit with error code if critical issues found
const criticalIssues = results.some(r => 
  r.issues.some(i => i.severity === 'error')
);

process.exit(criticalIssues ? 1 : 0);