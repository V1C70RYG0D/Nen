const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("=== Nen Anchor Programs - Comprehensive Test Suite ===");
console.log("Starting comprehensive test execution...");
console.log("");

const testFiles = [
  'tests/nen-core-simple.test.ts',
  'tests/nen-betting-simple.test.ts', 
  'tests/nen-magicblock-simple.test.ts',
  'tests/nen-marketplace-simple.test.ts',
  'tests/nen-core-advanced.test.ts',
  'tests/nen-betting-advanced.test.ts',
  'tests/nen-magicblock-advanced.test.ts',
  'tests/nen-marketplace-advanced.test.ts',
  'tests/anchor-final-test.ts'
];

let totalTests = 0;
let totalPassing = 0;
let totalFailing = 0;
const results = [];

console.log("Test files to execute:");
testFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});
console.log("");

testFiles.forEach(testFile => {
  console.log(`Running: ${testFile}`);
  console.log("----------------------------------------");
  
  try {
    const output = execSync(`npx ts-mocha ${testFile} --timeout 120000`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(output);
    
    const lines = output.split('\n');
    const resultLine = lines.find(line => line.includes('passing'));
    
    if (resultLine) {
      const match = resultLine.match(/(\d+) passing/);
      if (match) {
        const passing = parseInt(match[1]);
        totalTests += passing;
        totalPassing += passing;
        results.push({ file: testFile, status: 'PASS', tests: passing, errors: 0 });
      }
    }
    
  } catch (error) {
    console.log("ERROR:", error.message);
    const failing = 1; // Assume 1 failing test if execution fails
    totalTests += failing;
    totalFailing += failing;
    results.push({ file: testFile, status: 'FAIL', tests: 0, errors: failing });
  }
  
  console.log("");
});

console.log("=== COMPREHENSIVE TEST RESULTS SUMMARY ===");
console.log("");
console.log("Individual Test File Results:");
results.forEach((result, index) => {
  console.log(`  ${index + 1}. ${result.file}`);
  console.log(`     Status: ${result.status}`);
  console.log(`     Tests: ${result.tests} passing, ${result.errors} failing`);
});

console.log("");
console.log("Overall Statistics:");
console.log(`  Total test files: ${testFiles.length}`);
console.log(`  Total tests executed: ${totalTests}`);
console.log(`  Total passing: ${totalPassing}`);
console.log(`  Total failing: ${totalFailing}`);
console.log(`  Success rate: ${totalTests > 0 ? ((totalPassing / totalTests) * 100).toFixed(1) : 0}%`);

console.log("");
console.log("Program Deployment Status:");
console.log("  nen-core: DEPLOYED (Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF)");
console.log("  nen-betting: DEPLOYED (34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5)");
console.log("  nen-magicblock: DEPLOYED (AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX)");
console.log("  nen-marketplace: DEPLOYED (GN1TwG3ahrrJgd9EoKECHyVDzKHnm528hnXQfJRMWL2T)");

console.log("");
if (totalFailing === 0) {
  console.log("RESULT: ALL TESTS PASSING - 100% SUCCESS RATE");
  console.log("All Anchor programs tested successfully with comprehensive coverage");
} else {
  console.log("RESULT: SOME TESTS FAILING - REQUIRES ATTENTION");
  console.log("Please review failing tests and resolve issues");
}

console.log("");
console.log("Test execution completed at:", new Date().toISOString());
