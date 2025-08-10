#!/usr/bin/env node

/**
 * GI-10 Compliance: Backend Directory Reorganization
 * Systematically move files to maintain ≤10 files in root directory
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting GI-10 Compliance: Backend Directory Reorganization...');

const backendDir = __dirname;

// Create necessary directories
const dirs = [
  'docs/reports',
  'docs/testing',
  'scripts/testing',
  'scripts/load-testing',
  'results/load-testing',
  'results/phase-tests'
];

dirs.forEach(dir => {
  const fullPath = path.join(backendDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Get all files in root directory
const files = fs.readdirSync(backendDir).filter(item => {
  const stat = fs.statSync(path.join(backendDir, item));
  return stat.isFile() && !item.startsWith('.');
});

console.log(`📊 Found ${files.length} files in backend root directory`);

// Define file movement rules
const moveRules = [
  // Documentation files
  { pattern: /.*(_REPORT|_STATUS|_COMPLETE|_SUCCESS|API_|IMPLEMENTATION_|FINAL_).*\.md$/i, target: 'docs/reports' },
  { pattern: /.*PROJECT_IMPLEMENTATION\.md$/i, target: 'docs' },

  // Testing files
  { pattern: /.*test.*\.js$/i, target: 'scripts/testing' },
  { pattern: /load-test.*\.js$/i, target: 'scripts/load-testing' },
  { pattern: /.*-test-.*\.js$/i, target: 'scripts/load-testing' },

  // Result files
  { pattern: /.*results.*\.json$/i, target: 'results/load-testing' },
  { pattern: /phase.*\.json$/i, target: 'results/phase-tests' },
  { pattern: /.*report.*\.md$/i, target: 'docs/reports' },

  // Scripts
  { pattern: /.*\.(sh|bat)$/i, target: 'scripts' },
  { pattern: /.*(validation|launch|start).*\.js$/i, target: 'scripts' },

  // Logs (delete these)
  { pattern: /.*\.log$/i, target: 'DELETE' }
];

// Apply movement rules
let movedCount = 0;
let deletedCount = 0;

files.forEach(file => {
  const matchedRule = moveRules.find(rule => rule.pattern.test(file));

  if (matchedRule) {
    const sourcePath = path.join(backendDir, file);

    if (matchedRule.target === 'DELETE') {
      fs.unlinkSync(sourcePath);
      console.log(`🗑️  Deleted: ${file}`);
      deletedCount++;
    } else {
      const targetPath = path.join(backendDir, matchedRule.target, file);

      try {
        fs.renameSync(sourcePath, targetPath);
        console.log(`📁 Moved: ${file} → ${matchedRule.target}/`);
        movedCount++;
      } catch (error) {
        console.log(`❌ Failed to move ${file}: ${error.message}`);
      }
    }
  }
});

// Check final count
const finalFiles = fs.readdirSync(backendDir).filter(item => {
  const stat = fs.statSync(path.join(backendDir, item));
  return stat.isFile() && !item.startsWith('.');
});

console.log('\n📈 Cleanup Summary:');
console.log(`   Files moved: ${movedCount}`);
console.log(`   Files deleted: ${deletedCount}`);
console.log(`   Files remaining in root: ${finalFiles.length}/10`);
console.log(`   GI-10 Compliance: ${finalFiles.length <= 10 ? '✅ ACHIEVED' : '❌ NEEDS MORE WORK'}`);

if (finalFiles.length <= 10) {
  console.log('\n🎉 GI-10 Compliance achieved! Remaining files:');
  finalFiles.forEach(file => console.log(`   - ${file}`));
} else {
  console.log(`\n⚠️  Still ${finalFiles.length - 10} files over limit. Manual review needed.`);
}
