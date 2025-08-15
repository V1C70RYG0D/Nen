#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Nen Platform Smart Contract Test Runner');
console.log('==========================================\n');

// Test configurations
const testConfigs = [
    {
        name: '📊 Anchor Proper Test',
        file: 'tests/anchor-proper-test.ts',
        command: 'npx ts-mocha tests/anchor-proper-test.ts --timeout 60000 --require ts-node/register'
    },
    {
        name: '🔥 Anchor Final Test',
        file: 'tests/anchor-final-test.ts',
        command: 'npx ts-mocha tests/anchor-final-test.ts --timeout 60000 --require ts-node/register'
    },
    {
        name: '🎯 Anchor Integration Test',
        file: 'tests/anchor-integration-test.ts',
        command: 'npx ts-mocha tests/anchor-integration-test.ts --timeout 60000 --require ts-node/register'
    }
];

// Check if files exist
console.log('📁 Checking test files...');
for (const config of testConfigs) {
    const exists = fs.existsSync(config.file);
    console.log(`${exists ? '✅' : '❌'} ${config.file} ${exists ? 'exists' : 'NOT FOUND'}`);
}

console.log('\n🔧 Environment Check:');
console.log(`Node.js: ${process.version}`);
console.log(`Working Directory: ${process.cwd()}`);

// Check if target/deploy exists
const deployDir = './target/deploy';
const deployExists = fs.existsSync(deployDir);
console.log(`${deployExists ? '✅' : '❌'} target/deploy ${deployExists ? 'exists' : 'NOT FOUND'}`);

if (deployExists) {
    const files = fs.readdirSync(deployDir);
    console.log(`📦 Deployed programs: ${files.join(', ')}`);
}

// Check if target/idl exists
const idlDir = './target/idl';
const idlExists = fs.existsSync(idlDir);
console.log(`${idlExists ? '✅' : '❌'} target/idl ${idlExists ? 'exists' : 'NOT FOUND'}`);

if (idlExists) {
    const idlFiles = fs.readdirSync(idlDir);
    console.log(`📋 IDL files: ${idlFiles.join(', ')}`);
}

console.log('\n🎯 Available npm scripts:');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const scripts = Object.keys(packageJson.scripts).filter(s => s.includes('test'));
scripts.forEach(script => {
    console.log(`  npm run ${script}`);
});

console.log('\n💡 Test execution suggestions:');
console.log('1. Simple: npx ts-mocha tests/anchor-proper-test.ts --timeout 60000');
console.log('2. With config: npm run test');
console.log('3. Anchor test: anchor test');
console.log('4. Quick check: npm run validate');

console.log('\n🏁 Test runner completed!');
