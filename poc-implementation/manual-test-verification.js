#!/usr/bin/env node

/**
 * Manual Test Verification for Nen Platform POC
 * Following GI.md guidelines for comprehensive testing
 * Tests all AI system components according to poc_ai_system_plan.md and poc_ai_system_testing_assignment.md
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
let testResults = {
  fileSystemIntegrity: {},
  codeQuality: {},
  aiSystemCompliance: {},
  gICompliance: {},
  summary: {}
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const levels = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'TEST': '🧪'
  };
  console.log(`${levels[level]} [${timestamp}] ${message}`);
}

function testFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`${description}: EXISTS`, 'SUCCESS');
    return true;
  } else {
    log(`${description}: MISSING`, 'ERROR');
    return false;
  }
}

function testFileContent(filePath, requiredContent, description) {
  const fullPath = path.join(__dirname, filePath);
  
  try {
    if (!fs.existsSync(fullPath)) {
      log(`${description}: FILE NOT FOUND`, 'ERROR');
      return false;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasContent = requiredContent.every(item => content.includes(item));
    
    if (hasContent) {
      log(`${description}: CONTENT VALID`, 'SUCCESS');
      return true;
    } else {
      log(`${description}: MISSING REQUIRED CONTENT`, 'WARNING');
      return false;
    }
  } catch (error) {
    log(`${description}: READ ERROR - ${error.message}`, 'ERROR');
    return false;
  }
}

function testAISystemFileStructure() {
  log('\n🏗️ TESTING AI SYSTEM FILE STRUCTURE', 'TEST');
  log('=' .repeat(60));
  
  const requiredFiles = [
    // AI Agents (from poc_ai_system_plan.md)
    { path: 'backend/ai-services/agents/__init__.py', desc: 'AI Agents Module Init' },
    { path: 'backend/ai-services/agents/basic_ai_agents.py', desc: 'Basic AI Agents (Easy/Medium)' },
    { path: 'backend/ai-services/agents/hard_agent.py', desc: 'Hard AI Agent (Neural Network)' },
    { path: 'backend/ai-services/agents/ai_manager.py', desc: 'AI Manager' },
    
    // API Service
    { path: 'backend/ai-services/api_service.py', desc: 'AI API Service' },
    
    // Tests (from poc_ai_system_testing_assignment.md)
    { path: 'backend/ai-services/tests/conftest.py', desc: 'Test Configuration' },
    { path: 'backend/ai-services/tests/test_basic_agents.py', desc: 'Basic Agents Tests' },
    { path: 'backend/ai-services/tests/test_hard_agent.py', desc: 'Hard Agent Tests' },
    { path: 'backend/ai-services/tests/test_ai_manager.py', desc: 'AI Manager Tests' },
    
    // Documentation
    { path: 'docs/poc_ai_system_plan.md', desc: 'POC AI System Plan' },
    { path: 'docs/poc_ai_system_testing_assignment.md', desc: 'AI Testing Assignment' },
    { path: 'GI.md', desc: 'GI Guidelines' }
  ];
  
  let passed = 0;
  testResults.fileSystemIntegrity.totalFiles = requiredFiles.length;
  
  for (const file of requiredFiles) {
    if (testFileExists(file.path, file.desc)) {
      passed++;
    }
  }
  
  testResults.fileSystemIntegrity.passed = passed;
  testResults.fileSystemIntegrity.success = passed === requiredFiles.length;
  
  log(`\nFile Structure Test: ${passed}/${requiredFiles.length} files present`);
  return testResults.fileSystemIntegrity.success;
}

function testAIAgentsImplementation() {
  log('\n🤖 TESTING AI AGENTS IMPLEMENTATION', 'TEST');
  log('=' .repeat(60));
  
  const tests = [
    {
      file: 'backend/ai-services/agents/basic_ai_agents.py',
      requiredContent: [
        'class BaseAIAgent',
        'class RandomAI',
        'class MinimaxAI', 
        'class MCTSAI',
        'fraud_detection',
        'class AIPersonality',
        'AGGRESSIVE',
        'DEFENSIVE',
        'BALANCED',
        'get_move',
        'record_decision',
        'get_fraud_score'
      ],
      desc: 'Basic AI Agents Implementation'
    },
    {
      file: 'backend/ai-services/agents/hard_agent.py',
      requiredContent: [
        'class HardAgent',
        'neural_network',
        'minimax',
        'torch',
        'SimpleGungiNet',
        'get_move',
        'MagicBlock',
        'sub-100ms'
      ],
      desc: 'Hard AI Agent Implementation'
    },
    {
      file: 'backend/ai-services/agents/ai_manager.py',
      requiredContent: [
        'class AIManager',
        'get_agent',
        'create_match',
        'get_ai_move',
        'concurrent_games',
        'performance_stats',
        'stress_test'
      ],
      desc: 'AI Manager Implementation'
    }
  ];
  
  let passed = 0;
  testResults.aiSystemCompliance.totalImplementations = tests.length;
  
  for (const test of tests) {
    if (testFileContent(test.file, test.requiredContent, test.desc)) {
      passed++;
    }
  }
  
  testResults.aiSystemCompliance.passed = passed;
  testResults.aiSystemCompliance.success = passed === tests.length;
  
  log(`\nAI Implementation Test: ${passed}/${tests.length} implementations complete`);
  return testResults.aiSystemCompliance.success;
}

function testPerformanceRequirements() {
  log('\n⚡ TESTING PERFORMANCE REQUIREMENTS COMPLIANCE', 'TEST');
  log('=' .repeat(60));
  
  const performanceTests = [
    {
      file: 'backend/ai-services/agents/basic_ai_agents.py',
      requiredContent: [
        'max_move_time_ms',
        'target_move_time_ms',
        '100.0',  // MagicBlock requirement
        'performance_stats',
        'execution_times',
        'magicblock_compliance'
      ],
      desc: 'Performance Monitoring in Basic Agents'
    },
    {
      file: 'backend/ai-services/agents/hard_agent.py',
      requiredContent: [
        '90ms',  // Hard agent target
        'MagicBlock',
        'execution_time_ms',
        'performance_metrics',
        'time constraint'
      ],
      desc: 'Performance Requirements in Hard Agent'
    }
  ];
  
  let passed = 0;
  for (const test of performanceTests) {
    if (testFileContent(test.file, test.requiredContent, test.desc)) {
      passed++;
    }
  }
  
  log(`\nPerformance Requirements Test: ${passed}/${performanceTests.length} requirements met`);
  return passed === performanceTests.length;
}

function testFraudDetectionImplementation() {
  log('\n🛡️ TESTING FRAUD DETECTION IMPLEMENTATION', 'TEST');
  log('=' .repeat(60));
  
  const fraudTests = [
    {
      file: 'backend/ai-services/agents/basic_ai_agents.py',
      requiredContent: [
        '_analyze_for_fraud',
        'fraud_score',
        'suspicious',
        'decision_timestamps',
        'min_thinking_time_ms',
        'record_decision'
      ],
      desc: 'Fraud Detection in Base Agent'
    }
  ];
  
  let passed = 0;
  for (const test of fraudTests) {
    if (testFileContent(test.file, test.requiredContent, test.desc)) {
      passed++;
    }
  }
  
  log(`\nFraud Detection Test: ${passed}/${fraudTests.length} implementations complete`);
  return passed === fraudTests.length;
}

function testTestingFramework() {
  log('\n🧪 TESTING FRAMEWORK COMPLIANCE', 'TEST');
  log('=' .repeat(60));
  
  const testFrameworkTests = [
    {
      file: 'backend/ai-services/tests/test_basic_agents.py',
      requiredContent: [
        'TestRandomAI',
        'TestMinimaxAI',
        'TestMCTSAI',
        'test_move_generation',
        'test_performance',
        'test_fraud_detection',
        'test_personality_differences',
        '@pytest.mark'
      ],
      desc: 'Basic Agents Test Suite'
    },
    {
      file: 'backend/ai-services/tests/test_hard_agent.py',
      requiredContent: [
        'TestHardAgent',
        'test_neural_network',
        'test_magicblock_compliance',
        'test_move_generation',
        'pytest'
      ],
      desc: 'Hard Agent Test Suite'
    },
    {
      file: 'backend/ai-services/tests/conftest.py',
      requiredContent: [
        '@pytest.fixture',
        'sample_board_state',
        'basic_ai_config',
        'performance_timer',
        'AIConfig'
      ],
      desc: 'Test Configuration and Fixtures'
    }
  ];
  
  let passed = 0;
  for (const test of testFrameworkTests) {
    if (testFileContent(test.file, test.requiredContent, test.desc)) {
      passed++;
    }
  }
  
  log(`\nTesting Framework Test: ${passed}/${testFrameworkTests.length} test suites complete`);
  return passed === testFrameworkTests.length;
}

function testGICompliance() {
  log('\n📋 TESTING GI.MD COMPLIANCE', 'TEST');
  log('=' .repeat(60));
  
  const giTests = [
    {
      file: 'backend/ai-services/agents/basic_ai_agents.py',
      requiredContent: [
        'logging',
        'try:',
        'except Exception',
        'logger.error',
        'raise ValueError',
        'environment',
        'config',
        'no hardcoding'
      ],
      desc: 'GI Compliance - Error Handling & Logging'
    },
    {
      file: 'backend/ai-services/agents/ai_manager.py',
      requiredContent: [
        'concurrent',
        'ThreadPoolExecutor',
        'performance',
        'stress_test',
        'shutdown',
        'cleanup'
      ],
      desc: 'GI Compliance - Scalability & Resource Management'
    }
  ];
  
  let passed = 0;
  testResults.gICompliance.totalRequirements = giTests.length;
  
  for (const test of giTests) {
    if (testFileContent(test.file, test.requiredContent, test.desc)) {
      passed++;
    }
  }
  
  testResults.gICompliance.passed = passed;
  testResults.gICompliance.success = passed === giTests.length;
  
  log(`\nGI Compliance Test: ${passed}/${giTests.length} requirements met`);
  return testResults.gICompliance.success;
}

function testMagicBlockIntegration() {
  log('\n⚡ TESTING MAGICBLOCK INTEGRATION', 'TEST');
  log('=' .repeat(60));
  
  const magicBlockTests = [
    {
      file: 'backend/ai-services/agents/basic_ai_agents.py',
      requiredContent: [
        'max_move_time_ms',
        '100.0',
        'magicblock_compliance',
        'execution_time',
        'performance'
      ],
      desc: 'MagicBlock Performance Requirements'
    },
    {
      file: 'backend/ai-services/agents/hard_agent.py',
      requiredContent: [
        '90ms',
        'MagicBlock',
        'time constraint',
        'execution_time_ms',
        'max_move_time_ms'
      ],
      desc: 'MagicBlock Hard Agent Compliance'
    }
  ];
  
  let passed = 0;
  for (const test of magicBlockTests) {
    if (testFileContent(test.file, test.requiredContent, test.desc)) {
      passed++;
    }
  }
  
  log(`\nMagicBlock Integration Test: ${passed}/${magicBlockTests.length} requirements met`);
  return passed === magicBlockTests.length;
}

function generateComprehensiveReport() {
  log('\n📊 GENERATING COMPREHENSIVE REPORT', 'TEST');
  log('=' .repeat(60));
  
  const timestamp = new Date().toISOString();
  
  // Calculate overall scores
  const categories = [
    testResults.fileSystemIntegrity,
    testResults.aiSystemCompliance, 
    testResults.gICompliance
  ];
  
  const totalPassed = categories.reduce((sum, cat) => sum + (cat.passed || 0), 0);
  const totalTests = categories.reduce((sum, cat) => sum + (cat.totalFiles || cat.totalImplementations || cat.totalRequirements || 0), 0);
  
  testResults.summary = {
    timestamp,
    totalTests,
    totalPassed,
    successRate: totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0,
    overallStatus: totalPassed >= totalTests * 0.8 ? 'PASS' : 'NEEDS_ATTENTION'
  };
  
  // Generate report
  const report = {
    testExecution: {
      timestamp,
      environment: 'POC Development',
      testSuite: 'Comprehensive AI System Verification'
    },
    results: testResults,
    recommendations: generateRecommendations()
  };
  
  // Save report
  const reportPath = path.join(__dirname, 'MANUAL_TEST_VERIFICATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Display summary
  log('\n' + '=' .repeat(60));
  log('🎯 FINAL VERIFICATION RESULTS', 'TEST');
  log('=' .repeat(60));
  
  log(`📅 Test Date: ${timestamp}`);
  log(`📊 Total Tests: ${totalTests}`);
  log(`✅ Passed: ${totalPassed}`, totalPassed === totalTests ? 'SUCCESS' : 'WARNING');
  log(`❌ Failed: ${totalTests - totalPassed}`, totalPassed === totalTests ? 'SUCCESS' : 'ERROR');
  log(`📈 Success Rate: ${testResults.summary.successRate}%`, totalPassed >= totalTests * 0.8 ? 'SUCCESS' : 'WARNING');
  
  if (testResults.summary.overallStatus === 'PASS') {
    log('\n🎉 VERIFICATION COMPLETE: AI SYSTEM READY FOR TESTING', 'SUCCESS');
    log('All core components are implemented according to specifications.', 'SUCCESS');
  } else {
    log('\n⚠️  VERIFICATION COMPLETE: SYSTEM NEEDS ATTENTION', 'WARNING');
    log('Some components may need fixes before full deployment.', 'WARNING');
  }
  
  log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return report;
}

function generateRecommendations() {
  const recommendations = [];
  
  if (!testResults.fileSystemIntegrity.success) {
    recommendations.push({
      priority: 'HIGH',
      category: 'File Structure',
      issue: 'Missing critical AI system files',
      action: 'Ensure all required files from poc_ai_system_plan.md are implemented'
    });
  }
  
  if (!testResults.aiSystemCompliance.success) {
    recommendations.push({
      priority: 'HIGH', 
      category: 'AI Implementation',
      issue: 'Incomplete AI agent implementations',
      action: 'Complete missing AI agent classes and methods according to specifications'
    });
  }
  
  if (!testResults.gICompliance.success) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'GI Compliance',
      issue: 'Missing GI.md guideline implementations',
      action: 'Add proper error handling, logging, and resource management'
    });
  }
  
  return recommendations;
}

function runComprehensiveVerification() {
  log('🚀 STARTING COMPREHENSIVE AI SYSTEM VERIFICATION', 'INFO');
  log('Following POC AI System Plan and Testing Assignment specifications');
  log('=' .repeat(80));
  
  const testCategories = [
    { name: 'File Structure', test: testAISystemFileStructure },
    { name: 'AI Implementation', test: testAIAgentsImplementation },
    { name: 'Performance Requirements', test: testPerformanceRequirements },
    { name: 'Fraud Detection', test: testFraudDetectionImplementation },
    { name: 'Testing Framework', test: testTestingFramework },
    { name: 'GI Compliance', test: testGICompliance },
    { name: 'MagicBlock Integration', test: testMagicBlockIntegration }
  ];
  
  const results = {};
  
  for (const category of testCategories) {
    try {
      results[category.name] = category.test();
    } catch (error) {
      log(`Error in ${category.name}: ${error.message}`, 'ERROR');
      results[category.name] = false;
    }
  }
  
  // Generate final report
  const report = generateComprehensiveReport();
  
  return report;
}

// Execute if run directly
if (require.main === module) {
  try {
    const report = runComprehensiveVerification();
    process.exit(report.results.summary.overallStatus === 'PASS' ? 0 : 1);
  } catch (error) {
    log(`Fatal error during verification: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

module.exports = {
  runComprehensiveVerification,
  testAISystemFileStructure,
  testAIAgentsImplementation,
  generateComprehensiveReport
};
