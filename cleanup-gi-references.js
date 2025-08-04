#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to remove or replace
const patterns = [
  // Remove GI-related comments and lines

  /.*Following GI-\d+:.*\n?/gi,
  /.*GI-\d+:.*\n?/gi,




  // Clean up lines that become empty after GI removal
  /^\s*\/\/\s*-\s*$\n?/gm,
  /^\s*#\s*-\s*$\n?/gm,
  /^\s*\*\s*-\s*$\n?/gm,

  // Remove empty comment blocks
  /\/\*\*\s*\*\/\n?/g,
  /\/\*\s*\*\/\n?/g,

  // Clean up consecutive empty lines
  /\n\n\n+/g
];

// Replacement patterns
const replacements = [
  // Replace GI-specific terms with generic ones
  ['best practices', 'best practices'],
  ['validation', 'validation'],
  ['validation', 'validation'],
  ['success rate', 'success rate'],
  ['status', 'status'],
  ['validation framework', 'validation framework']
];

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Apply patterns
    patterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });

    // Apply replacements
    replacements.forEach(([from, to]) => {
      const regex = new RegExp(from, 'gi');
      content = content.replace(regex, to);
    });

    // Clean up multiple consecutive newlines
    content = content.replace(/\n\n\n+/g, '\n\n');

    // Trim trailing whitespace
    content = content.replace(/[ \t]+$/gm, '');

    // If content changed, write it back
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleaned: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, extensions = ['.js', '.ts', '.py', '.sh', '.md']) {
  let cleanedFiles = 0;

  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .venv, .git, etc.
        if (!['node_modules', '.venv', '.git', 'coverage', 'dist', 'build'].includes(item)) {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          if (cleanFile(fullPath)) {
            cleanedFiles++;
          }
        }
      }
    }
  }

  walk(dir);
  return cleanedFiles;
}

// Start cleanup
console.log('🧹 Starting GI references cleanup...');
const cleanedCount = walkDirectory(__dirname);
console.log(`\n✅ Cleanup complete! Cleaned ${cleanedCount} files.`);
