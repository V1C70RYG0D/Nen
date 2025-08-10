#!/usr/bin/env node

/**
 * Nen Platform - Main Entry Point
 *
 * This script provides a unified interface to run different parts of the platform:
 * - Development server (frontend + backend + AI)
 * - Production server
 * - Testing suites
 * - Build processes
 * - Deployment scripts
 *
 * Organized with minimal root directory files
 * All configuration values externalized
 */

// Global error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Load environment configuration - No hardcoded values
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });
require('dotenv').config({ path: path.join(__dirname, 'config', 'constants.env') });
require('dotenv').config({ path: path.join(__dirname, 'config', 'colors.env') });
require('dotenv').config({ path: path.join(__dirname, 'config', 'game.env') });
require('dotenv').config({ path: path.join(__dirname, 'config', 'test.env') });

// Configuration - No hardcoded values
const config = {
  colors: {
    reset: process.env.COLOR_RESET,
    bright: process.env.COLOR_BRIGHT,
    red: process.env.COLOR_RED,
    green: process.env.COLOR_GREEN,
    yellow: process.env.COLOR_YELLOW,
    blue: process.env.COLOR_BLUE,
    magenta: process.env.COLOR_MAGENTA,
    cyan: process.env.COLOR_CYAN
  },
  paths: {
    deployment: path.join(__dirname, 'infrastructure', 'deployment'),
    testing: path.join(__dirname, 'testing'),
    infrastructure: path.join(__dirname, 'infrastructure'),
    config: path.join(__dirname, 'config'),
    scripts: path.join(__dirname, 'tools', 'scripts'),
    docs: path.join(__dirname, 'docs'),
    tools: path.join(__dirname, 'tools')
  },
  project: {
    name: process.env.PROJECT_NAME,
    version: process.env.PROJECT_VERSION
  }
};

// GI-18 best practices: Validate required environment variables
const requiredEnvVars = [
  'COLOR_RESET', 'COLOR_BRIGHT', 'COLOR_RED', 'COLOR_GREEN',
  'COLOR_YELLOW', 'COLOR_BLUE', 'COLOR_MAGENTA', 'COLOR_CYAN',
  'PROJECT_NAME', 'PROJECT_VERSION'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ GI-18 Compliance Error: Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('Please ensure all configuration files are properly loaded.');
  process.exit(1);
}

function log(message, color = 'reset') {
  console.log(`${config.colors[color]}${message}${config.colors.reset}`);
}

function showUsage() {
  log('\n🎮 Nen Platform - Unified Project Runner', 'cyan');
  log('=' .repeat(50), 'cyan');
  log('\nUsage: node main.js <command> [options]', 'bright');
  log('\nAvailable Commands:', 'yellow');
  log('  dev                  - Start development environment', 'green');
  log('  start               - Start production environment', 'green');
  log('  build               - Build all components', 'green');
  log('  test                - Run all tests', 'green');
  log('  deploy              - Deploy to production', 'green');
  log('  help                - Show this help message', 'green');
  log('');
}

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const command = process.argv[2];

  if (!command || command === 'help') {
    showUsage();
    return;
  }

  try {
    switch (command) {
      case 'dev':
        log('🚀 Starting development environment...', 'green');
        await runCommand('npm', ['run', 'dev']);
        break;

      case 'start':
        log('🌟 Starting production environment...', 'green');
        await runCommand('npm', ['start']);
        break;

      case 'build':
        log('🔨 Building project...', 'green');
        await runCommand('npm', ['run', 'build']);
        break;

      case 'test':
        log('🧪 Running tests...', 'green');
        await runCommand('npm', ['test']);
        break;

      case 'deploy':
        log('🚀 Deploying to production...', 'green');
        await runCommand('npm', ['run', 'deploy']);
        break;

      default:
        log(`❌ Unknown command: ${command}`, 'red');
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    log(`❌ Command '${command}' failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// GI Compliance Functions
function checkGICompliance() {
  log('🔍 Checking GI compliance...', 'cyan');

  const checks = [
    { name: 'Environment Variables', passed: missingEnvVars.length === 0 },
    { name: 'Configuration Files', passed: fs.existsSync(path.join(config.paths.config, '.env')) },
    { name: 'Project Structure', passed: fs.existsSync(path.join(__dirname, 'backend')) && fs.existsSync(path.join(__dirname, 'frontend')) }
  ];

  let allPassed = true;
  checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    log(`  ${status} ${check.name}`, check.passed ? 'green' : 'red');
    if (!check.passed) {allPassed = false;}
  });

  return allPassed;
}

function showGIStatus() {
  log('\n📋 GI Compliance Status:', 'bright');
  log('=' .repeat(40), 'cyan');

  const compliance = checkGICompliance();

  if (compliance) {
    log('\n✅ All GI guidelines are being followed', 'green');
  } else {
    log('\n❌ Some GI guidelines need attention', 'red');
  }

  return compliance;
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n🛑 Received SIGINT, shutting down gracefully...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Received SIGTERM, shutting down gracefully...', 'yellow');
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    log(`💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  main,
  checkGICompliance,
  showGIStatus,
  config
};
