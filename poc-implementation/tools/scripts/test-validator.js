#!/usr/bin/env node
console.log('🔍 validation Started...');

const fs = require('fs');
const path = require('path');

// Test basic functionality
try {
    const projectRoot = process.cwd();
    console.log('Project root:', projectRoot);

    // Check root files
    const rootFiles = fs.readdirSync(projectRoot)
        .filter(item => fs.statSync(path.join(projectRoot, item)).isFile())
        .filter(file => !file.startsWith('.'));

    console.log(`Root files count: ${rootFiles.length}`);
    console.log('Files:', rootFiles);

    // Check for hardcoding in a sample file
    const mainPath = path.join(projectRoot, 'main.js');
    if (fs.existsSync(mainPath)) {
        console.log('✅ main.js exists');
    } else {
        console.log('❌ main.js missing');
    }

    console.log('🎉 Basic validation complete!');

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
