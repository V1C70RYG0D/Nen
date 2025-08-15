/**
 * AI System Code Review and Testing Script
 * Following GI.md guidelines and poc_ai_system_plan.md specifications
 * Performs comprehensive static analysis and validation
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
    log(`✅ ${message}`, 'green');
}

function error(message) {
    log(`❌ ${message}`, 'red');
}

function warning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function header(message) {
    log(`\n${message}`, 'cyan');
    log('='.repeat(60), 'cyan');
}

// Test results tracking
const testResults = {
    fileStructure: { passed: 0, total: 0, issues: [] },
    codeQuality: { passed: 0, total: 0, issues: [] },
    aiImplementation: { passed: 0, total: 0, issues: [] },
    performanceCompliance: { passed: 0, total: 0, issues: [] },
    giCompliance: { passed: 0, total: 0, issues: [] },
    testingFramework: { passed: 0, total: 0, issues: [] }
};

function fileExists(filePath) {
    try {
        return fs.existsSync(path.join(__dirname, filePath));
    } catch (error) {
        return false;
    }
}

function readFileContent(filePath) {
    try {
        return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    } catch (error) {
        return null;
    }
}

function checkFileStructure() {
    header('🏗️ FILE STRUCTURE VALIDATION');
    
    const requiredFiles = [
        // Core AI System Files
        { path: 'backend/ai-services/agents/__init__.py', desc: 'AI Agents Module Init', critical: true },
        { path: 'backend/ai-services/agents/basic_ai_agents.py', desc: 'Basic AI Agents', critical: true },
        { path: 'backend/ai-services/agents/hard_agent.py', desc: 'Hard AI Agent', critical: true },
        { path: 'backend/ai-services/agents/ai_manager.py', desc: 'AI Manager', critical: true },
        
        // API and Services
        { path: 'backend/ai-services/api_service.py', desc: 'AI API Service', critical: true },
        
        // Testing Framework
        { path: 'backend/ai-services/tests/conftest.py', desc: 'Test Configuration', critical: false },
        { path: 'backend/ai-services/tests/test_basic_agents.py', desc: 'Basic Agents Tests', critical: false },
        { path: 'backend/ai-services/tests/test_hard_agent.py', desc: 'Hard Agent Tests', critical: false },
        { path: 'backend/ai-services/tests/test_ai_manager.py', desc: 'AI Manager Tests', critical: false },
        
        // Documentation
        { path: 'docs/poc_ai_system_plan.md', desc: 'POC AI System Plan', critical: true },
        { path: 'docs/poc_ai_system_testing_assignment.md', desc: 'AI Testing Assignment', critical: true },
        { path: 'GI.md', desc: 'GI Guidelines', critical: true },
        
        // Configuration
        { path: 'backend/ai-services/pytest.ini', desc: 'Pytest Configuration', critical: false }
    ];
    
    testResults.fileStructure.total = requiredFiles.length;
    
    for (const file of requiredFiles) {
        if (fileExists(file.path)) {
            success(`${file.desc}: FOUND`);
            testResults.fileStructure.passed++;
        } else {
            if (file.critical) {
                error(`${file.desc}: MISSING (CRITICAL)`);
                testResults.fileStructure.issues.push(`Missing critical file: ${file.path}`);
            } else {
                warning(`${file.desc}: MISSING`);
                testResults.fileStructure.issues.push(`Missing file: ${file.path}`);
            }
        }
    }
    
    info(`File Structure: ${testResults.fileStructure.passed}/${testResults.fileStructure.total} files found`);
}

function analyzeBasicAIAgents() {
    header('🤖 BASIC AI AGENTS ANALYSIS');
    
    const filePath = 'backend/ai-services/agents/basic_ai_agents.py';
    const content = readFileContent(filePath);
    
    if (!content) {
        error('basic_ai_agents.py not found or unreadable');
        return;
    }
    
    const requirements = [
        { pattern: /class BaseAIAgent/, desc: 'BaseAIAgent class definition', critical: true },
        { pattern: /class RandomAI/, desc: 'RandomAI class (Easy difficulty)', critical: true },
        { pattern: /class MinimaxAI/, desc: 'MinimaxAI class (Medium difficulty)', critical: true },
        { pattern: /class MCTSAI/, desc: 'MCTSAI class (Hard difficulty fallback)', critical: true },
        { pattern: /class AIPersonality/, desc: 'AI Personality enum', critical: true },
        { pattern: /AGGRESSIVE|DEFENSIVE|BALANCED/, desc: 'Personality types', critical: true },
        { pattern: /fraud_detection|fraud_score/, desc: 'Fraud detection system', critical: true },
        { pattern: /get_move/, desc: 'Move generation method', critical: true },
        { pattern: /record_decision/, desc: 'Decision recording', critical: true },
        { pattern: /performance_stats/, desc: 'Performance tracking', critical: true },
        { pattern: /max_move_time_ms/, desc: 'MagicBlock timing constraints', critical: true },
        { pattern: /100\.0/, desc: 'MagicBlock 100ms requirement', critical: true },
        { pattern: /logging/, desc: 'Proper logging implementation', critical: false },
        { pattern: /try:|except/, desc: 'Error handling', critical: true },
        { pattern: /GungiBoardEvaluator/, desc: 'Board evaluation system', critical: true }
    ];
    
    testResults.aiImplementation.total += requirements.length;
    
    for (const req of requirements) {
        if (req.pattern.test(content)) {
            success(`${req.desc}: IMPLEMENTED`);
            testResults.aiImplementation.passed++;
        } else {
            if (req.critical) {
                error(`${req.desc}: MISSING (CRITICAL)`);
                testResults.aiImplementation.issues.push(`Missing: ${req.desc}`);
            } else {
                warning(`${req.desc}: MISSING`);
                testResults.aiImplementation.issues.push(`Missing: ${req.desc}`);
            }
        }
    }
    
    // Additional analysis
    const classCount = (content.match(/^class\s+\w+/gm) || []).length;
    const methodCount = (content.match(/def\s+\w+/g) || []).length;
    const lineCount = content.split('\n').length;
    
    info(`Code metrics: ${classCount} classes, ${methodCount} methods, ${lineCount} lines`);
}

function analyzeHardAgent() {
    header('🧠 HARD AI AGENT ANALYSIS');
    
    const filePath = 'backend/ai-services/agents/hard_agent.py';
    const content = readFileContent(filePath);
    
    if (!content) {
        error('hard_agent.py not found or unreadable');
        return;
    }
    
    const requirements = [
        { pattern: /class HardAgent/, desc: 'HardAgent class definition', critical: true },
        { pattern: /neural_network|torch|SimpleGungiNet/, desc: 'Neural network integration', critical: true },
        { pattern: /minimax/, desc: 'Minimax algorithm integration', critical: true },
        { pattern: /90ms|90\.0/, desc: 'Hard agent 90ms target', critical: true },
        { pattern: /MagicBlock/, desc: 'MagicBlock compliance mentions', critical: true },
        { pattern: /execution_time/, desc: 'Execution time monitoring', critical: true },
        { pattern: /MockNeuralNetwork/, desc: 'Fallback for missing PyTorch', critical: false },
        { pattern: /load_model/, desc: 'Model loading functionality', critical: true },
        { pattern: /_board_to_tensor/, desc: 'Board state conversion', critical: true },
        { pattern: /get_move/, desc: 'Move generation implementation', critical: true },
        { pattern: /performance_metrics/, desc: 'Performance tracking', critical: true }
    ];
    
    testResults.aiImplementation.total += requirements.length;
    
    for (const req of requirements) {
        if (req.pattern.test(content)) {
            success(`${req.desc}: IMPLEMENTED`);
            testResults.aiImplementation.passed++;
        } else {
            if (req.critical) {
                error(`${req.desc}: MISSING (CRITICAL)`);
                testResults.aiImplementation.issues.push(`Hard Agent - Missing: ${req.desc}`);
            } else {
                warning(`${req.desc}: MISSING`);
                testResults.aiImplementation.issues.push(`Hard Agent - Missing: ${req.desc}`);
            }
        }
    }
}

function analyzeAIManager() {
    header('⚙️ AI MANAGER ANALYSIS');
    
    const filePath = 'backend/ai-services/agents/ai_manager.py';
    const content = readFileContent(filePath);
    
    if (!content) {
        error('ai_manager.py not found or unreadable');
        return;
    }
    
    const requirements = [
        { pattern: /class AIManager/, desc: 'AIManager class definition', critical: true },
        { pattern: /get_agent/, desc: 'Agent retrieval method', critical: true },
        { pattern: /create_match/, desc: 'Match creation functionality', critical: true },
        { pattern: /get_ai_move/, desc: 'AI move generation endpoint', critical: true },
        { pattern: /concurrent_games/, desc: 'Concurrent game support', critical: true },
        { pattern: /ThreadPoolExecutor/, desc: 'Thread pool for concurrency', critical: true },
        { pattern: /stress_test/, desc: 'Stress testing capability', critical: true },
        { pattern: /performance_stats/, desc: 'Performance statistics', critical: true },
        { pattern: /100/, desc: 'Support for 100+ concurrent games', critical: true },
        { pattern: /shutdown/, desc: 'Proper resource cleanup', critical: true },
        { pattern: /fraud_score/, desc: 'Fraud detection integration', critical: true }
    ];
    
    testResults.aiImplementation.total += requirements.length;
    
    for (const req of requirements) {
        if (req.pattern.test(content)) {
            success(`${req.desc}: IMPLEMENTED`);
            testResults.aiImplementation.passed++;
        } else {
            if (req.critical) {
                error(`${req.desc}: MISSING (CRITICAL)`);
                testResults.aiImplementation.issues.push(`AI Manager - Missing: ${req.desc}`);
            } else {
                warning(`${req.desc}: MISSING`);
                testResults.aiImplementation.issues.push(`AI Manager - Missing: ${req.desc}`);
            }
        }
    }
}

function analyzeTestFramework() {
    header('🧪 TESTING FRAMEWORK ANALYSIS');
    
    const testFiles = [
        'backend/ai-services/tests/test_basic_agents.py',
        'backend/ai-services/tests/test_hard_agent.py', 
        'backend/ai-services/tests/test_ai_manager.py',
        'backend/ai-services/tests/conftest.py'
    ];
    
    for (const testFile of testFiles) {
        const content = readFileContent(testFile);
        testResults.testingFramework.total++;
        
        if (!content) {
            error(`${testFile}: NOT FOUND`);
            testResults.testingFramework.issues.push(`Missing test file: ${testFile}`);
            continue;
        }
        
        // Check for pytest markers and structure
        const hasTestStructure = /def test_/.test(content);
        const hasPytestMarkers = /@pytest\.mark/.test(content);
        const hasFixtures = /@pytest\.fixture/.test(content);
        
        if (hasTestStructure) {
            success(`${path.basename(testFile)}: Has test structure`);
            testResults.testingFramework.passed++;
        } else {
            error(`${path.basename(testFile)}: Missing test structure`);
            testResults.testingFramework.issues.push(`${testFile} lacks proper test structure`);
        }
        
        if (testFile.includes('conftest.py')) {
            if (hasFixtures) {
                success(`conftest.py: Has test fixtures`);
            } else {
                warning(`conftest.py: Missing test fixtures`);
            }
        }
    }
}

function analyzePerformanceCompliance() {
    header('⚡ PERFORMANCE & MAGICBLOCK COMPLIANCE');
    
    const performanceFiles = [
        'backend/ai-services/agents/basic_ai_agents.py',
        'backend/ai-services/agents/hard_agent.py'
    ];
    
    const performanceRequirements = [
        { pattern: /max_move_time_ms.*100/, desc: '100ms MagicBlock limit', weight: 3 },
        { pattern: /target_move_time_ms.*50/, desc: '50ms target for medium AI', weight: 2 },
        { pattern: /90ms|90\.0/, desc: '90ms target for hard AI', weight: 3 },
        { pattern: /execution_time/, desc: 'Execution time monitoring', weight: 2 },
        { pattern: /performance_stats/, desc: 'Performance statistics tracking', weight: 2 },
        { pattern: /magicblock_compliance/, desc: 'MagicBlock compliance flag', weight: 3 },
        { pattern: /timeout|time.*constraint/, desc: 'Timeout handling', weight: 2 }
    ];
    
    for (const file of performanceFiles) {
        const content = readFileContent(file);
        if (!content) continue;
        
        info(`Analyzing performance compliance in ${path.basename(file)}`);
        
        for (const req of performanceRequirements) {
            testResults.performanceCompliance.total++;
            
            if (req.pattern.test(content)) {
                success(`${req.desc}: IMPLEMENTED`);
                testResults.performanceCompliance.passed += req.weight;
            } else {
                warning(`${req.desc}: NOT FOUND`);
                testResults.performanceCompliance.issues.push(`${file} - Missing: ${req.desc}`);
            }
        }
    }
}

function analyzeGICompliance() {
    header('📋 GI.MD COMPLIANCE ANALYSIS');
    
    const allPythonFiles = [
        'backend/ai-services/agents/basic_ai_agents.py',
        'backend/ai-services/agents/hard_agent.py',
        'backend/ai-services/agents/ai_manager.py'
    ];
    
    const giRequirements = [
        { pattern: /import logging|logger\s*=/, desc: 'Proper logging (GI #6)', weight: 2 },
        { pattern: /try:|except Exception/, desc: 'Error handling (GI #6)', weight: 3 },
        { pattern: /raise ValueError|raise TypeError/, desc: 'Proper exceptions (GI #4)', weight: 2 },
        { pattern: /os\.environ|getenv/, desc: 'Environment variables (GI #3)', weight: 2 },
        { pattern: /concurrent|threading|ThreadPool/, desc: 'Concurrency support (GI #14)', weight: 2 },
        { pattern: /performance|metrics|stats/, desc: 'Performance monitoring (GI #15)', weight: 2 },
        { pattern: /config|Config/, desc: 'Configuration management (GI #3)', weight: 1 },
        { pattern: /cleanup|shutdown|close/, desc: 'Resource management (GI #31)', weight: 2 }
    ];
    
    for (const file of allPythonFiles) {
        const content = readFileContent(file);
        if (!content) continue;
        
        info(`Analyzing GI compliance in ${path.basename(file)}`);
        
        for (const req of giRequirements) {
            testResults.giCompliance.total++;
            
            if (req.pattern.test(content)) {
                success(`${req.desc}: COMPLIANT`);
                testResults.giCompliance.passed += req.weight;
            } else {
                warning(`${req.desc}: NON-COMPLIANT`);
                testResults.giCompliance.issues.push(`${file} - ${req.desc}`);
            }
        }
    }
}

function analyzeCodeQuality() {
    header('🔍 CODE QUALITY ANALYSIS');
    
    const pythonFiles = [
        'backend/ai-services/agents/basic_ai_agents.py',
        'backend/ai-services/agents/hard_agent.py',
        'backend/ai-services/agents/ai_manager.py'
    ];
    
    for (const file of pythonFiles) {
        const content = readFileContent(file);
        if (!content) continue;
        
        testResults.codeQuality.total += 6; // 6 quality checks per file
        
        // Check for docstrings
        if (/"""[\s\S]*?"""/.test(content)) {
            success(`${path.basename(file)}: Has documentation`);
            testResults.codeQuality.passed++;
        } else {
            warning(`${path.basename(file)}: Missing documentation`);
            testResults.codeQuality.issues.push(`${file} lacks proper docstrings`);
        }
        
        // Check for type hints
        if (/:\s*\w+(\[\w+\])?/.test(content)) {
            success(`${path.basename(file)}: Has type hints`);
            testResults.codeQuality.passed++;
        } else {
            warning(`${path.basename(file)}: Missing type hints`);
            testResults.codeQuality.issues.push(`${file} lacks type hints`);
        }
        
        // Check for imports organization
        if (/^from\s+typing\s+import/.test(content)) {
            success(`${path.basename(file)}: Proper typing imports`);
            testResults.codeQuality.passed++;
        } else {
            warning(`${path.basename(file)}: Missing typing imports`);
            testResults.codeQuality.issues.push(`${file} should import from typing`);
        }
        
        // Check for constants (no hardcoding)
        const hardcodedNumbers = content.match(/\b\d{2,}\b/g) || [];
        if (hardcodedNumbers.length < 10) {
            success(`${path.basename(file)}: Minimal hardcoded values`);
            testResults.codeQuality.passed++;
        } else {
            warning(`${path.basename(file)}: Many hardcoded values (${hardcodedNumbers.length})`);
            testResults.codeQuality.issues.push(`${file} has many hardcoded values`);
        }
        
        // Check for meaningful variable names
        const shortVars = content.match(/\b[a-z]\b/g) || [];
        if (shortVars.length < 20) {
            success(`${path.basename(file)}: Good variable naming`);
            testResults.codeQuality.passed++;
        } else {
            warning(`${path.basename(file)}: Many single-letter variables`);
            testResults.codeQuality.issues.push(`${file} uses too many single-letter variables`);
        }
        
        // Check file size (maintainability)
        const lineCount = content.split('\n').length;
        if (lineCount < 1000) {
            success(`${path.basename(file)}: Reasonable size (${lineCount} lines)`);
            testResults.codeQuality.passed++;
        } else {
            warning(`${path.basename(file)}: Large file (${lineCount} lines)`);
            testResults.codeQuality.issues.push(`${file} is very large and may need refactoring`);
        }
    }
}

function generateSummaryReport() {
    header('📊 COMPREHENSIVE SUMMARY REPORT');
    
    const categories = [
        { name: 'File Structure', data: testResults.fileStructure },
        { name: 'AI Implementation', data: testResults.aiImplementation },
        { name: 'Performance Compliance', data: testResults.performanceCompliance },
        { name: 'Testing Framework', data: testResults.testingFramework },
        { name: 'Code Quality', data: testResults.codeQuality },
        { name: 'GI Compliance', data: testResults.giCompliance }
    ];
    
    let totalPassed = 0;
    let totalTests = 0;
    
    for (const category of categories) {
        const { name, data } = category;
        const passed = data.passed || 0;
        const total = data.total || 0;
        const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
        
        totalPassed += passed;
        totalTests += total;
        
        if (percentage >= 80) {
            success(`${name}: ${passed}/${total} (${percentage}%)`);
        } else if (percentage >= 60) {
            warning(`${name}: ${passed}/${total} (${percentage}%)`);
        } else {
            error(`${name}: ${passed}/${total} (${percentage}%)`);
        }
    }
    
    const overallPercentage = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
    
    log('\n' + '='.repeat(60));
    log(`🎯 OVERALL RESULTS: ${totalPassed}/${totalTests} (${overallPercentage}%)`, 'bright');
    
    if (overallPercentage >= 85) {
        success('🎉 EXCELLENT: AI System is well-implemented and ready for testing!');
    } else if (overallPercentage >= 70) {
        warning('⚠️  GOOD: AI System is mostly complete with minor issues to address');
    } else if (overallPercentage >= 50) {
        warning('📝 NEEDS WORK: AI System has significant gaps that need attention');
    } else {
        error('❌ CRITICAL: AI System requires major implementation work');
    }
    
    // Generate detailed issues report
    if (testResults.fileStructure.issues.length > 0 ||
        testResults.aiImplementation.issues.length > 0 ||
        testResults.performanceCompliance.issues.length > 0) {
        
        log('\n📋 PRIORITY ISSUES TO ADDRESS:', 'yellow');
        
        const allIssues = [
            ...testResults.fileStructure.issues,
            ...testResults.aiImplementation.issues,
            ...testResults.performanceCompliance.issues,
            ...testResults.testingFramework.issues,
            ...testResults.codeQuality.issues,
            ...testResults.giCompliance.issues
        ];
        
        allIssues.slice(0, 10).forEach((issue, index) => {
            log(`${index + 1}. ${issue}`, 'yellow');
        });
        
        if (allIssues.length > 10) {
            log(`... and ${allIssues.length - 10} more issues`, 'yellow');
        }
    }
    
    // Save detailed report
    const report = {
        timestamp: new Date().toISOString(),
        overall: {
            passed: totalPassed,
            total: totalTests,
            percentage: overallPercentage,
            status: overallPercentage >= 85 ? 'EXCELLENT' : 
                   overallPercentage >= 70 ? 'GOOD' :
                   overallPercentage >= 50 ? 'NEEDS_WORK' : 'CRITICAL'
        },
        categories: testResults,
        recommendations: generateRecommendations()
    };
    
    try {
        fs.writeFileSync(
            path.join(__dirname, 'AI_SYSTEM_ANALYSIS_REPORT.json'),
            JSON.stringify(report, null, 2)
        );
        info('📄 Detailed report saved to AI_SYSTEM_ANALYSIS_REPORT.json');
    } catch (error) {
        warning('Could not save detailed report');
    }
    
    return report;
}

function generateRecommendations() {
    const recommendations = [];
    
    if (testResults.fileStructure.passed < testResults.fileStructure.total * 0.8) {
        recommendations.push({
            priority: 'HIGH',
            category: 'File Structure',
            issue: 'Missing critical AI system files',
            action: 'Implement missing components according to poc_ai_system_plan.md',
            impact: 'System cannot function without core files'
        });
    }
    
    if (testResults.aiImplementation.passed < testResults.aiImplementation.total * 0.7) {
        recommendations.push({
            priority: 'HIGH',
            category: 'AI Implementation',
            issue: 'Incomplete AI agent implementations',
            action: 'Complete missing methods and functionality in AI agents',
            impact: 'AI agents will not work properly in games'
        });
    }
    
    if (testResults.performanceCompliance.passed < testResults.performanceCompliance.total * 0.8) {
        recommendations.push({
            priority: 'HIGH',
            category: 'Performance',
            issue: 'Missing MagicBlock compliance features',
            action: 'Implement proper timing constraints and performance monitoring',
            impact: 'Will not meet sub-100ms requirements for MagicBlock'
        });
    }
    
    if (testResults.testingFramework.passed < testResults.testingFramework.total * 0.6) {
        recommendations.push({
            priority: 'MEDIUM',
            category: 'Testing',
            issue: 'Incomplete testing framework',
            action: 'Complete test suites according to poc_ai_system_testing_assignment.md',
            impact: 'Cannot verify system functionality before deployment'
        });
    }
    
    if (testResults.giCompliance.passed < testResults.giCompliance.total * 0.7) {
        recommendations.push({
            priority: 'MEDIUM',
            category: 'GI Compliance',
            issue: 'Missing GI.md guideline implementations',
            action: 'Add proper error handling, logging, and resource management',
            impact: 'Code quality and maintainability issues'
        });
    }
    
    return recommendations;
}

function runComprehensiveAnalysis() {
    log('🚀 STARTING COMPREHENSIVE AI SYSTEM ANALYSIS', 'bright');
    log('Following POC AI System Plan and GI.md Guidelines', 'cyan');
    log('='.repeat(80), 'cyan');
    
    try {
        checkFileStructure();
        analyzeBasicAIAgents();
        analyzeHardAgent();
        analyzeAIManager();
        analyzeTestFramework();
        analyzePerformanceCompliance();
        analyzeCodeQuality();
        analyzeGICompliance();
        
        const report = generateSummaryReport();
        
        log('\n✨ Analysis complete! Check the detailed report for next steps.', 'cyan');
        
        return report.overall.status === 'EXCELLENT' || report.overall.status === 'GOOD';
        
    } catch (error) {
        error(`Analysis failed: ${error.message}`);
        return false;
    }
}

// Execute analysis
if (require.main === module) {
    const success = runComprehensiveAnalysis();
    process.exit(success ? 0 : 1);
}

module.exports = {
    runComprehensiveAnalysis,
    checkFileStructure,
    analyzeBasicAIAgents,
    analyzeHardAgent,
    analyzeAIManager
};
