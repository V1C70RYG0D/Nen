#!/usr/bin/env node

/**
 * WebSocket Test Validation Script
 * Validates the structure and completeness of WebSocket tests
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateTestFiles() {
  log('blue', '🔍 Validating WebSocket test files...');
  
  const testDir = path.join(process.cwd(), 'tests');
  const expectedFiles = [
    'websocket-connection-tests.ts',
    'websocket-load-tests.ts', 
    'websocket-security-tests.ts',
    'websocket-global-setup.js',
    'websocket-global-teardown.js'
  ];
  
  let allValid = true;
  
  expectedFiles.forEach(file => {
    const filePath = path.join(testDir, file);
    if (fs.existsSync(filePath)) {
      log('green', `✅ Found: ${file}`);
      
      // Basic content validation
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (file.endsWith('.ts')) {
        // TypeScript test file validations
        const hasDescribe = content.includes('describe(');
        const hasTest = content.includes('test(') || content.includes('it(');
        const hasSocket = content.includes('Client(') || content.includes('ClientSocket');
        
        if (!hasDescribe) {
          log('yellow', `  ⚠️  Warning: No describe blocks found in ${file}`);
        }
        if (!hasTest) {
          log('yellow', `  ⚠️  Warning: No test cases found in ${file}`);
        }
        if (!hasSocket) {
          log('yellow', `  ⚠️  Warning: No WebSocket client usage found in ${file}`);
        }
        
        if (hasDescribe && hasTest && hasSocket) {
          log('green', `  ✅ ${file} appears to be properly structured`);
        }
      } else {
        // JavaScript setup/teardown file validations
        const hasModuleExports = content.includes('module.exports');
        const hasAsync = content.includes('async');
        
        if (!hasModuleExports) {
          log('red', `  ❌ Error: No module.exports found in ${file}`);
          allValid = false;
        }
        if (!hasAsync) {
          log('yellow', `  ⚠️  Warning: No async function found in ${file}`);
        }
      }
    } else {
      log('red', `❌ Missing: ${file}`);
      allValid = false;
    }
  });
  
  return allValid;
}

function validateConfigFiles() {
  log('blue', '🔍 Validating configuration files...');
  
  const configFiles = [
    'jest.websocket.config.js',
    'package.json'
  ];
  
  let allValid = true;
  
  configFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log('green', `✅ Found: ${file}`);
      
      if (file === 'jest.websocket.config.js') {
        const content = fs.readFileSync(filePath, 'utf8');
        const hasTestMatch = content.includes('testMatch');
        const hasCoverage = content.includes('collectCoverage');
        const hasTimeout = content.includes('testTimeout');
        
        if (!hasTestMatch) {
          log('red', `  ❌ Error: No testMatch configuration in ${file}`);
          allValid = false;
        }
        if (!hasCoverage) {
          log('yellow', `  ⚠️  Warning: No coverage configuration in ${file}`);
        }
        if (!hasTimeout) {
          log('yellow', `  ⚠️  Warning: No timeout configuration in ${file}`);
        }
      }
      
      if (file === 'package.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        const packageJson = JSON.parse(content);
        
        const hasWebSocketTest = packageJson.scripts && packageJson.scripts['test:websocket'];
        const hasSocketIO = packageJson.dependencies && packageJson.dependencies['socket.io'];
        const hasSocketIOClient = packageJson.devDependencies && packageJson.devDependencies['socket.io-client'];
        
        if (!hasWebSocketTest) {
          log('red', `  ❌ Error: No test:websocket script in ${file}`);
          allValid = false;
        }
        if (!hasSocketIO) {
          log('red', `  ❌ Error: socket.io not found in dependencies`);
          allValid = false;
        }
        if (!hasSocketIOClient) {
          log('red', `  ❌ Error: socket.io-client not found in devDependencies`);
          allValid = false;
        }
      }
    } else {
      log('red', `❌ Missing: ${file}`);
      allValid = false;
    }
  });
  
  return allValid;
}

function validateScripts() {
  log('blue', '🔍 Validating test scripts...');
  
  const scriptsDir = path.join(process.cwd(), 'scripts');
  const expectedScripts = [
    'run-websocket-tests.sh'
  ];
  
  let allValid = true;
  
  expectedScripts.forEach(script => {
    const scriptPath = path.join(scriptsDir, script);
    if (fs.existsSync(scriptPath)) {
      log('green', `✅ Found: ${script}`);
      
      // Check if script is executable (Unix-like systems)
      try {
        const stats = fs.statSync(scriptPath);
        const isExecutable = (stats.mode & 0o111) !== 0;
        if (isExecutable) {
          log('green', `  ✅ ${script} is executable`);
        } else {
          log('yellow', `  ⚠️  Warning: ${script} is not executable`);
        }
      } catch (error) {
        log('yellow', `  ⚠️  Warning: Could not check permissions for ${script}`);
      }
      
      const content = fs.readFileSync(scriptPath, 'utf8');
      const hasShebang = content.startsWith('#!/bin/bash');
      const hasMainFunction = content.includes('main()');
      const hasCleanup = content.includes('cleanup');
      
      if (!hasShebang) {
        log('yellow', `  ⚠️  Warning: No shebang found in ${script}`);
      }
      if (!hasMainFunction) {
        log('yellow', `  ⚠️  Warning: No main function found in ${script}`);
      }
      if (!hasCleanup) {
        log('yellow', `  ⚠️  Warning: No cleanup function found in ${script}`);
      }
    } else {
      log('red', `❌ Missing: ${script}`);
      allValid = false;
    }
  });
  
  return allValid;
}

function validateDirectories() {
  log('blue', '🔍 Validating directory structure...');
  
  const expectedDirs = [
    'tests',
    'scripts',
    'src/routes',
    'src/websockets'
  ];
  
  let allValid = true;
  
  expectedDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      const stats = fs.statSync(dirPath);
      if (stats.isDirectory()) {
        log('green', `✅ Directory exists: ${dir}`);
      } else {
        log('red', `❌ Path exists but is not a directory: ${dir}`);
        allValid = false;
      }
    } else {
      log('red', `❌ Missing directory: ${dir}`);
      allValid = false;
    }
  });
  
  return allValid;
}

function validateSourceFiles() {
  log('blue', '🔍 Validating WebSocket source files...');
  
  const sourceFiles = [
    'src/routes/websocket.ts',
    'src/__tests__/websocket.test.ts',
    'src/__tests__/mocks/websocketMock.ts'
  ];
  
  let allValid = true;
  
  sourceFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log('green', `✅ Found: ${file}`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (file.includes('routes/websocket.ts')) {
        const hasWebSocketManager = content.includes('WebSocketManager') || content.includes('websocketManager');
        const hasSocketIO = content.includes('socket.io') || content.includes('Server');
        const hasEventHandlers = content.includes('socket.on');
        
        if (!hasWebSocketManager) {
          log('yellow', `  ⚠️  Warning: No WebSocketManager found in ${file}`);
        }
        if (!hasSocketIO) {
          log('red', `  ❌ Error: No Socket.IO usage found in ${file}`);
          allValid = false;
        }
        if (!hasEventHandlers) {
          log('red', `  ❌ Error: No event handlers found in ${file}`);
          allValid = false;
        }
      }
    } else {
      log('yellow', `⚠️  Optional file missing: ${file}`);
    }
  });
  
  return allValid;
}

function generateReport() {
  log('blue', '📊 Generating validation report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    validations: {
      testFiles: validateTestFiles(),
      configFiles: validateConfigFiles(), 
      scripts: validateScripts(),
      directories: validateDirectories(),
      sourceFiles: validateSourceFiles()
    }
  };
  
  const allValid = Object.values(report.validations).every(valid => valid);
  
  log('blue', '\n📋 Validation Summary:');
  Object.entries(report.validations).forEach(([category, valid]) => {
    const status = valid ? '✅ PASS' : '❌ FAIL';
    const color = valid ? 'green' : 'red';
    log(color, `  ${category}: ${status}`);
  });
  
  if (allValid) {
    log('green', '\n🎉 All WebSocket test validations passed!');
    log('green', '✅ Your WebSocket testing setup is ready to use.');
  } else {
    log('red', '\n💥 Some validations failed!');
    log('red', '❌ Please fix the issues above before running tests.');
  }
  
  // Save report to file
  const reportsDir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, 'websocket-test-validation.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log('blue', `📄 Validation report saved to: ${reportPath}`);
  
  return allValid ? 0 : 1;
}

// Main execution
if (require.main === module) {
  log('blue', '🚀 WebSocket Test Validation Starting...\n');
  const exitCode = generateReport();
  process.exit(exitCode);
}

module.exports = {
  validateTestFiles,
  validateConfigFiles,
  validateScripts,
  validateDirectories,
  validateSourceFiles,
  generateReport
};
