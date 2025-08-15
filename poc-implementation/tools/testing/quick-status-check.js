#!/usr/bin/env node
/**
 * Quick System Status Check
 * Provides a fast overview of system status
 */

const fs = require('fs').promises;

async function quickStatusCheck() {
  console.log('🔍 QUICK SYSTEM STATUS CHECK');
  console.log('============================');
  
  let score = 0;
  let total = 0;
  
  // Check file structure
  const requiredFiles = [
    'package.json',
    'main.js', 
    'config/.env',
    'backend/package.json',
    'backend/simple-server.js',
    'ai/app.py'
  ];
  
  console.log('\n📁 File Structure:');
  for (const file of requiredFiles) {
    total++;
    try {
      await fs.access(file);
      console.log(`✅ ${file}`);
      score++;
    } catch (error) {
      console.log(`❌ ${file}`);
    }
  }
  
  // Check package.json validity
  console.log('\n📦 Package Configuration:');
  try {
    total++;
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
    if (pkg.scripts && pkg.dependencies) {
      console.log('✅ Root package.json valid');
      score++;
    } else {
      console.log('❌ Root package.json incomplete');
    }
  } catch (error) {
    console.log('❌ Root package.json invalid');
  }
  
  try {
    total++;
    const backendPkg = JSON.parse(await fs.readFile('backend/package.json', 'utf8'));
    if (backendPkg.scripts && backendPkg.dependencies) {
      console.log('✅ Backend package.json valid');
      score++;
    } else {
      console.log('❌ Backend package.json incomplete');
    }
  } catch (error) {
    console.log('❌ Backend package.json invalid');
  }
  
  // Check environment configuration
  console.log('\n⚙️ Environment Configuration:');
  try {
    total++;
    const envContent = await fs.readFile('config/.env', 'utf8');
    const hasRequiredVars = ['NODE_ENV', 'BACKEND_PORT', 'AI_SERVICE_PORT'].every(
      v => envContent.includes(v)
    );
    if (hasRequiredVars) {
      console.log('✅ Environment variables configured');
      score++;
    } else {
      console.log('❌ Missing environment variables');
    }
  } catch (error) {
    console.log('❌ Environment configuration not found');
  }
  
  // Check module loading
  console.log('\n🟢 Module Loading:');
  try {
    total++;
    delete require.cache[require.resolve('../main.js')];
    const mainModule = require('../main.js');
    if (mainModule && mainModule.config && typeof mainModule.checkGICompliance === 'function') {
      console.log('✅ Main module loads correctly');
      score++;
    } else {
      console.log('❌ Main module incomplete');
    }
  } catch (error) {
    console.log(`❌ Main module error: ${error.message}`);
  }
  
  // Check backend build
  console.log('\n🔧 Backend Build:');
  try {
    total++;
    await fs.access('backend/dist/main.js');
    console.log('✅ Backend built successfully');
    score++;
  } catch (error) {
    console.log('❌ Backend not built');
  }
  
  // Calculate success rate
  const successRate = (score / total) * 100;
  
  console.log('\n' + '='.repeat(40));
  console.log('📊 QUICK STATUS SUMMARY');
  console.log('='.repeat(40));
  console.log(`Checks Passed: ${score}/${total}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 85) {
    console.log('\n🎉 SYSTEM STATUS: EXCELLENT');
    console.log('✅ All critical components working');
  } else if (successRate >= 70) {
    console.log('\n✅ SYSTEM STATUS: GOOD');
    console.log('✅ Most components working correctly');
  } else if (successRate >= 50) {
    console.log('\n⚠️ SYSTEM STATUS: NEEDS ATTENTION');
    console.log('🔧 Some components need fixes');
  } else {
    console.log('\n❌ SYSTEM STATUS: CRITICAL ISSUES');
    console.log('🔧 Major fixes required');
  }
  
  return successRate >= 70;
}

if (require.main === module) {
  quickStatusCheck()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Status check failed:', error);
      process.exit(1);
    });
}

module.exports = { quickStatusCheck };
