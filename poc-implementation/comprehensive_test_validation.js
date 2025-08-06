#!/usr/bin/env node

/**
 * Comprehensive Test Validation Script
 * Reviews and validates all smart contract implementations and tests
 * Following GI.md Guidelines: Real implementations, Production readiness, 100% test coverage
 */

const fs = require('fs');
const path = require('path');

// Configuration following GI #3: Externalized configuration
const VALIDATION_CONFIG = {
    smartContractsDir: 'A:\\Nen Platform\\Nen\\poc-implementation\\smart-contracts',
    testDirs: [
        'tests/unit',
        'tests/integration', 
        'tests/security',
        'tests/performance'
    ],
    programDirs: [
        'programs/nen-core/src',
        'programs/nen-magicblock/src'
    ],
    requiredFiles: [
        'Anchor.toml',
        'Cargo.toml',
        'package.json'
    ],
    testCategories: {
        'Platform Initialization': 'core-initialization.test.ts',
        'User Management': ['user-management.test.ts', 'enhanced-user-creation.test.ts'],
        'Match Creation': 'match-creation.test.ts',
        'Betting System': 'betting-system.test.ts',
        'Financial Security': ['financial-security.test.ts', 'financial-security-core.test.ts', 'financial-security-demo.test.ts'],
        'Access Control': 'access-control.test.ts',
        'Reentrancy Protection': 'reentrancy-protection.test.ts',
        'Performance Testing': 'performance.test.ts',
        'MagicBlock Integration': 'magicblock-integration.test.ts',
        'Risk Management': 'risk-management.test.ts',
        'Resource Optimization': 'resource-optimization.test.ts'
    }
};

class ComprehensiveTestValidator {
    constructor() {
        this.results = {
            smartContractFiles: [],
            testFiles: [],
            implementations: {},
            testCoverage: {},
            issues: [],
            recommendations: [],
            overallStatus: 'UNKNOWN'
        };
    }

    /**
     * Main validation entry point
     * GI #8: Test extensively at every stage
     */
    async validateImplementation() {
        console.log('🔍 COMPREHENSIVE SMART CONTRACT IMPLEMENTATION VALIDATION');
        console.log('================================================================');
        console.log(`📅 Started: ${new Date().toISOString()}`);
        console.log(`📂 Directory: ${VALIDATION_CONFIG.smartContractsDir}`);
        console.log('================================================================\n');

        try {
            // Step 1: Validate directory structure
            await this.validateDirectoryStructure();

            // Step 2: Analyze smart contract implementations
            await this.analyzeSmartContracts();

            // Step 3: Validate test implementations
            await this.validateTestSuite();

            // Step 4: Check configuration files
            await this.validateConfiguration();

            // Step 5: Analyze implementation completeness
            await this.analyzeImplementationCompleteness();

            // Step 6: Generate comprehensive report
            await this.generateValidationReport();

        } catch (error) {
            console.error('❌ Validation failed:', error);
            this.results.overallStatus = 'FAILED';
        }

        return this.results;
    }

    /**
     * Validate directory structure and required files
     * GI #37: Manage files and repository cleanliness
     */
    async validateDirectoryStructure() {
        console.log('📁 Validating Directory Structure...');

        const baseDir = VALIDATION_CONFIG.smartContractsDir;
        if (!fs.existsSync(baseDir)) {
            this.addIssue('CRITICAL', 'Smart contracts directory not found', baseDir);
            return;
        }

        // Check required files
        for (const requiredFile of VALIDATION_CONFIG.requiredFiles) {
            const filePath = path.join(baseDir, requiredFile);
            if (fs.existsSync(filePath)) {
                console.log(`✅ Found: ${requiredFile}`);
            } else {
                this.addIssue('HIGH', `Missing required file: ${requiredFile}`, filePath);
            }
        }

        // Check program directories
        for (const programDir of VALIDATION_CONFIG.programDirs) {
            const dirPath = path.join(baseDir, programDir);
            if (fs.existsSync(dirPath)) {
                console.log(`✅ Found program directory: ${programDir}`);
                
                // Check for lib.rs
                const libPath = path.join(dirPath, 'lib.rs');
                if (fs.existsSync(libPath)) {
                    console.log(`✅ Found lib.rs in ${programDir}`);
                    this.results.smartContractFiles.push(libPath);
                } else {
                    this.addIssue('HIGH', `Missing lib.rs in program directory: ${programDir}`, libPath);
                }
            } else {
                this.addIssue('HIGH', `Missing program directory: ${programDir}`, dirPath);
            }
        }

        // Check test directories
        for (const testDir of VALIDATION_CONFIG.testDirs) {
            const dirPath = path.join(baseDir, testDir);
            if (fs.existsSync(dirPath)) {
                console.log(`✅ Found test directory: ${testDir}`);
                
                // Find test files
                const testFiles = this.findTestFiles(dirPath);
                this.results.testFiles.push(...testFiles);
                console.log(`   Found ${testFiles.length} test files`);
            } else {
                this.addIssue('MEDIUM', `Test directory not found: ${testDir}`, dirPath);
            }
        }

        console.log(`✅ Directory structure validation complete\n`);
    }

    /**
     * Analyze smart contract implementations
     * GI #4: Error-free, working systems
     */
    async analyzeSmartContracts() {
        console.log('🔧 Analyzing Smart Contract Implementations...');

        for (const contractFile of this.results.smartContractFiles) {
            console.log(`\n📄 Analyzing: ${path.basename(contractFile)}`);
            
            if (!fs.existsSync(contractFile)) {
                this.addIssue('HIGH', `Contract file not found: ${contractFile}`);
                continue;
            }

            const content = fs.readFileSync(contractFile, 'utf8');
            const analysis = this.analyzeContractContent(content, contractFile);
            
            const fileName = path.basename(contractFile);
            this.results.implementations[fileName] = analysis;

            // Report findings
            console.log(`   📊 Functions: ${analysis.functions.length}`);
            console.log(`   📦 Structs: ${analysis.structs.length}`);
            console.log(`   🔔 Events: ${analysis.events.length}`);
            console.log(`   ❌ Errors: ${analysis.errorCodes.length}`);
            console.log(`   🔧 Instructions: ${analysis.instructions.length}`);

            if (analysis.issues.length > 0) {
                console.log(`   ⚠️ Issues found: ${analysis.issues.length}`);
                analysis.issues.forEach(issue => this.addIssue('MEDIUM', issue, contractFile));
            }
        }

        console.log(`✅ Smart contract analysis complete\n`);
    }

    /**
     * Validate test suite implementation
     * GI #8: Achieve 100% test coverage
     */
    async validateTestSuite() {
        console.log('🧪 Validating Test Suite Implementation...');

        // Check for required test categories
        for (const [category, files] of Object.entries(VALIDATION_CONFIG.testCategories)) {
            console.log(`\n📋 Checking: ${category}`);
            
            const testFiles = Array.isArray(files) ? files : [files];
            let categoryImplemented = false;

            for (const testFile of testFiles) {
                const found = this.results.testFiles.some(f => f.includes(testFile));
                if (found) {
                    console.log(`   ✅ Found: ${testFile}`);
                    categoryImplemented = true;
                    
                    // Analyze test content
                    const fullPath = this.findFullTestPath(testFile);
                    if (fullPath) {
                        const testAnalysis = this.analyzeTestFile(fullPath);
                        this.results.testCoverage[testFile] = testAnalysis;
                    }
                } else {
                    console.log(`   ❌ Missing: ${testFile}`);
                }
            }

            if (!categoryImplemented) {
                this.addIssue('HIGH', `No tests found for category: ${category}`);
            }
        }

        console.log(`✅ Test suite validation complete\n`);
    }

    /**
     * Validate configuration files
     * GI #3: Prohibit hardcoding and placeholders
     */
    async validateConfiguration() {
        console.log('⚙️ Validating Configuration Files...');

        const baseDir = VALIDATION_CONFIG.smartContractsDir;

        // Validate Anchor.toml
        const anchorToml = path.join(baseDir, 'Anchor.toml');
        if (fs.existsSync(anchorToml)) {
            const content = fs.readFileSync(anchorToml, 'utf8');
            console.log('✅ Anchor.toml exists');
            
            if (content.includes('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')) {
                console.log('✅ Program IDs configured');
            } else {
                this.addIssue('MEDIUM', 'Program IDs may not be properly configured');
            }
        }

        // Validate package.json
        const packageJson = path.join(baseDir, 'package.json');
        if (fs.existsSync(packageJson)) {
            const content = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            console.log('✅ package.json exists');
            
            const testScripts = Object.keys(content.scripts || {}).filter(s => s.startsWith('test'));
            console.log(`✅ Test scripts configured: ${testScripts.length}`);
            
            if (content.dependencies && content.dependencies['@coral-xyz/anchor']) {
                console.log('✅ Anchor dependency configured');
            }
        }

        console.log(`✅ Configuration validation complete\n`);
    }

    /**
     * Analyze implementation completeness against specifications
     * GI #33: Maintain comprehensive documentation
     */
    async analyzeImplementationCompleteness() {
        console.log('📊 Analyzing Implementation Completeness...');

        const requiredFeatures = {
            'Platform Initialization': {
                functions: ['initialize_platform'],
                implemented: false
            },
            'User Management': {
                functions: ['create_user_account', 'create_enhanced_user'],
                implemented: false
            },
            'Match Creation': {
                functions: ['create_match', 'create_enhanced_match'],
                implemented: false
            },
            'Betting System': {
                functions: ['place_bet'],
                implemented: false
            },
            'Move Submission': {
                functions: ['submit_move'],
                implemented: false
            },
            'AI Agent NFT': {
                functions: ['mint_ai_agent_nft'],
                implemented: false
            },
            'MagicBlock Integration': {
                functions: ['create_enhanced_session', 'submit_move_bolt_ecs'],
                implemented: false
            }
        };

        // Check implementation status
        for (const [contractFile, analysis] of Object.entries(this.results.implementations)) {
            for (const [feature, spec] of Object.entries(requiredFeatures)) {
                const implementedFunctions = spec.functions.filter(fn => 
                    analysis.functions.some(f => f.includes(fn))
                );
                
                if (implementedFunctions.length > 0) {
                    requiredFeatures[feature].implemented = true;
                    console.log(`✅ ${feature}: ${implementedFunctions.join(', ')}`);
                }
            }
        }

        // Report missing features
        for (const [feature, spec] of Object.entries(requiredFeatures)) {
            if (!spec.implemented) {
                console.log(`❌ ${feature}: Not implemented`);
                this.addIssue('HIGH', `Missing feature implementation: ${feature}`);
            }
        }

        console.log(`✅ Implementation completeness analysis complete\n`);
    }

    /**
     * Generate comprehensive validation report
     * GI #33: Maintain comprehensive documentation
     */
    async generateValidationReport() {
        console.log('📋 Generating Comprehensive Validation Report...');

        const summary = this.generateSummary();
        
        console.log('\n================================================================');
        console.log('📊 VALIDATION SUMMARY');
        console.log('================================================================');
        console.log(`📄 Smart Contract Files: ${this.results.smartContractFiles.length}`);
        console.log(`🧪 Test Files: ${this.results.testFiles.length}`);
        console.log(`✅ Implementations Found: ${Object.keys(this.results.implementations).length}`);
        console.log(`📊 Test Categories Covered: ${Object.keys(this.results.testCoverage).length}`);
        console.log(`⚠️ Issues Found: ${this.results.issues.length}`);
        console.log(`💡 Recommendations: ${this.results.recommendations.length}`);

        // Issue breakdown
        const issueCounts = this.categorizeIssues();
        console.log('\n🔍 ISSUE BREAKDOWN:');
        console.log(`   🔴 Critical: ${issueCounts.CRITICAL}`);
        console.log(`   🟠 High: ${issueCounts.HIGH}`);
        console.log(`   🟡 Medium: ${issueCounts.MEDIUM}`);
        console.log(`   🔵 Low: ${issueCounts.LOW}`);

        // Overall status
        this.results.overallStatus = this.determineOverallStatus(issueCounts);
        console.log(`\n🎯 OVERALL STATUS: ${this.getStatusIcon()} ${this.results.overallStatus}`);

        // Detailed issues
        if (this.results.issues.length > 0) {
            console.log('\n⚠️ DETAILED ISSUES:');
            this.results.issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. [${issue.severity}] ${issue.message}`);
                if (issue.location) {
                    console.log(`      📍 ${issue.location}`);
                }
            });
        }

        // Recommendations
        if (this.results.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            this.results.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }

        // Save detailed report
        await this.saveDetailedReport();

        console.log('\n================================================================');
        console.log('✅ Validation report generation complete');
        console.log('================================================================');
    }

    /**
     * Helper Methods
     */

    findTestFiles(directory) {
        const testFiles = [];
        if (fs.existsSync(directory)) {
            const files = fs.readdirSync(directory);
            for (const file of files) {
                const fullPath = path.join(directory, file);
                if (fs.statSync(fullPath).isFile() && file.endsWith('.test.ts')) {
                    testFiles.push(fullPath);
                }
            }
        }
        return testFiles;
    }

    findFullTestPath(testFile) {
        return this.results.testFiles.find(f => f.includes(testFile));
    }

    analyzeContractContent(content, filePath) {
        const analysis = {
            functions: [],
            structs: [],
            events: [],
            errorCodes: [],
            instructions: [],
            issues: []
        };

        // Extract functions
        const functionMatches = content.match(/pub fn \w+/g) || [];
        analysis.functions = functionMatches.map(match => match.replace('pub fn ', ''));

        // Extract structs
        const structMatches = content.match(/#\[account\]\s*pub struct \w+/g) || [];
        analysis.structs = structMatches.map(match => match.replace(/#\[account\]\s*pub struct /, ''));

        // Extract events
        const eventMatches = content.match(/#\[event\]\s*pub struct \w+/g) || [];
        analysis.events = eventMatches.map(match => match.replace(/#\[event\]\s*pub struct /, ''));

        // Extract error codes
        const errorMatches = content.match(/#\[msg\(".*?"\)\]/g) || [];
        analysis.errorCodes = errorMatches;

        // Check for common issues
        if (content.includes('todo!') || content.includes('unimplemented!')) {
            analysis.issues.push('Contains TODO or unimplemented macros');
        }

        if (content.includes('panic!')) {
            analysis.issues.push('Contains panic! macro - should use Result types');
        }

        return analysis;
    }

    analyzeTestFile(filePath) {
        if (!fs.existsSync(filePath)) {
            return { exists: false, testCount: 0, issues: ['File not found'] };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        
        // Count test functions
        const testMatches = content.match(/it\(/g) || [];
        const describeMatches = content.match(/describe\(/g) || [];
        
        return {
            exists: true,
            testCount: testMatches.length,
            suiteCount: describeMatches.length,
            hasAsyncTests: content.includes('async'),
            hasAssertions: content.includes('expect('),
            issues: []
        };
    }

    addIssue(severity, message, location = null) {
        this.results.issues.push({
            severity,
            message,
            location,
            timestamp: new Date().toISOString()
        });
    }

    categorizeIssues() {
        const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        this.results.issues.forEach(issue => {
            counts[issue.severity] = (counts[issue.severity] || 0) + 1;
        });
        return counts;
    }

    determineOverallStatus(issueCounts) {
        if (issueCounts.CRITICAL > 0) return 'CRITICAL ISSUES FOUND';
        if (issueCounts.HIGH > 3) return 'MULTIPLE HIGH PRIORITY ISSUES';
        if (issueCounts.HIGH > 0) return 'HIGH PRIORITY ISSUES FOUND';
        if (issueCounts.MEDIUM > 5) return 'MANY MEDIUM PRIORITY ISSUES';
        if (issueCounts.MEDIUM > 0) return 'IMPLEMENTATION IN PROGRESS';
        return 'IMPLEMENTATION LOOKS GOOD';
    }

    getStatusIcon() {
        switch (this.results.overallStatus) {
            case 'CRITICAL ISSUES FOUND': return '🔴';
            case 'MULTIPLE HIGH PRIORITY ISSUES': return '🟠';
            case 'HIGH PRIORITY ISSUES FOUND': return '🟠';
            case 'MANY MEDIUM PRIORITY ISSUES': return '🟡';
            case 'IMPLEMENTATION IN PROGRESS': return '🟡';
            case 'IMPLEMENTATION LOOKS GOOD': return '✅';
            default: return '❓';
        }
    }

    generateSummary() {
        return {
            totalFiles: this.results.smartContractFiles.length + this.results.testFiles.length,
            implementationStatus: this.results.overallStatus,
            criticalIssues: this.results.issues.filter(i => i.severity === 'CRITICAL').length,
            completionPercentage: this.calculateCompletionPercentage()
        };
    }

    calculateCompletionPercentage() {
        const totalRequiredFeatures = Object.keys(VALIDATION_CONFIG.testCategories).length;
        const implementedFeatures = Object.keys(this.results.testCoverage).length;
        return Math.round((implementedFeatures / totalRequiredFeatures) * 100);
    }

    async saveDetailedReport() {
        const reportData = {
            ...this.results,
            summary: this.generateSummary(),
            generatedAt: new Date().toISOString(),
            validator: 'ComprehensiveTestValidator v1.0.0'
        };

        const reportPath = path.join(VALIDATION_CONFIG.smartContractsDir, 'validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        
        console.log(`📄 Detailed report saved: ${reportPath}`);
        return reportPath;
    }
}

// Main execution
if (require.main === module) {
    const validator = new ComprehensiveTestValidator();
    validator.validateImplementation()
        .then(results => {
            const exitCode = results.overallStatus.includes('CRITICAL') ? 1 : 0;
            process.exit(exitCode);
        })
        .catch(console.error);
}

module.exports = ComprehensiveTestValidator;
