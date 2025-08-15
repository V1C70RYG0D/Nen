#!/usr/bin/env node

/**
 * Core Initialization Test Validation Script
 * Following GI.md Guidelines: Verification, Error-free systems, Step-by-step validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoreInitTestValidator {
    constructor() {
        this.results = {
            fileValidation: [],
            syntaxValidation: [],
            configValidation: [],
            dependencyValidation: [],
            errors: [],
            warnings: []
        };

        this.basePath = path.join(__dirname, '..');
        this.testFiles = [
            'tests/unit/core-initialization.test.ts',
            'tests/config/core-initialization-config.ts',
            'scripts/run-core-initialization-tests.js'
        ];
    }

    /**
     * Main validation entry point
     * GI #15: Thoroughly verify functionality
     */
    async validate() {
        console.log('🔍 Core Initialization Test Validation');
        console.log('=' .repeat(60));

        try {
            // Step 1: File structure validation
            await this.validateFileStructure();

            // Step 2: Syntax validation
            await this.validateSyntax();

            // Step 3: Configuration validation
            await this.validateConfiguration();

            // Step 4: Dependency validation
            await this.validateDependencies();

            // Step 5: Generate validation report
            this.generateValidationReport();

            if (this.results.errors.length === 0) {
                console.log('\n✅ All validations passed successfully!');
                console.log('🚀 Core initialization tests are ready to run.');
                return true;
            } else {
                console.log(`\n❌ ${this.results.errors.length} validation errors found.`);
                return false;
            }

        } catch (error) {
            console.error('\n💥 Validation failed:', error);
            return false;
        }
    }

    /**
     * Validate file structure and existence
     * GI #10: Manage files and repository cleanliness
     */
    async validateFileStructure() {
        console.log('\n📁 Validating File Structure...');

        const requiredFiles = [
            ...this.testFiles,
            'tests/unit/CORE_INITIALIZATION_TESTS_README.md',
            'package.json',
            'tsconfig.json'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.basePath, file);
            const exists = fs.existsSync(filePath);

            this.results.fileValidation.push({
                file,
                exists,
                status: exists ? 'FOUND' : 'MISSING'
            });

            if (exists) {
                console.log(`  ✅ ${file}`);
            } else {
                console.log(`  ❌ ${file} - MISSING`);
                this.results.errors.push(`Required file missing: ${file}`);
            }
        }

        // Check for proper directory structure
        const requiredDirs = [
            'tests/unit',
            'tests/config',
            'scripts',
            'test-artifacts'
        ];

        for (const dir of requiredDirs) {
            const dirPath = path.join(this.basePath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`  🔧 Created directory: ${dir}`);
            } else {
                console.log(`  📁 ${dir}`);
            }
        }
    }

    /**
     * Validate TypeScript syntax and compilation
     * GI #19: Enforce code style and consistency
     */
    async validateSyntax() {
        console.log('\n🔍 Validating Syntax...');

        const tsFiles = this.testFiles.filter(f => f.endsWith('.ts'));

        for (const file of tsFiles) {
            const filePath = path.join(this.basePath, file);

            if (!fs.existsSync(filePath)) {
                continue;
            }

            try {
                // Check TypeScript syntax
                const command = `npx tsc --noEmit --skipLibCheck ${filePath}`;
                execSync(command, {
                    cwd: this.basePath,
                    stdio: 'pipe'
                });

                console.log(`  ✅ ${file} - Syntax OK`);
                this.results.syntaxValidation.push({
                    file,
                    status: 'VALID'
                });

            } catch (error) {
                console.log(`  ❌ ${file} - Syntax Error`);
                console.log(`     ${error.message}`);

                this.results.syntaxValidation.push({
                    file,
                    status: 'INVALID',
                    error: error.message
                });

                this.results.errors.push(`Syntax error in ${file}: ${error.message}`);
            }
        }
    }

    /**
     * Validate test configuration
     * GI #18: Prohibit hardcoding, externalize configuration
     */
    async validateConfiguration() {
        console.log('\n⚙️ Validating Configuration...');

        const configFile = path.join(this.basePath, 'tests/config/core-initialization-config.ts');

        if (!fs.existsSync(configFile)) {
            this.results.errors.push('Configuration file missing');
            return;
        }

        try {
            const configContent = fs.readFileSync(configFile, 'utf8');

            // Check for required configuration sections
            const requiredSections = [
                'CORE_INIT_TEST_CONFIG',
                'CORE_INIT_TEST_SCENARIOS',
                'PDA_CONFIG',
                'EXPECTED_ACCOUNT_STATES'
            ];

            for (const section of requiredSections) {
                if (configContent.includes(section)) {
                    console.log(`  ✅ ${section} - Found`);
                    this.results.configValidation.push({
                        section,
                        status: 'FOUND'
                    });
                } else {
                    console.log(`  ❌ ${section} - Missing`);
                    this.results.configValidation.push({
                        section,
                        status: 'MISSING'
                    });
                    this.results.errors.push(`Configuration section missing: ${section}`);
                }
            }

            // Check for hardcoded values (anti-pattern per GI #18)
            const hardcodedPatterns = [
                /process\.env\.\w+\s*\|\|\s*["'][^"']*["']/g,  // Environment variable with fallback
                /"http:\/\/localhost:\d+"/g,                    // Hardcoded URLs
                /\d{4,}/g                                       // Large numbers that might be hardcoded
            ];

            let hasHardcodedValues = false;
            for (const pattern of hardcodedPatterns) {
                const matches = configContent.match(pattern);
                if (matches && matches.length > 5) { // Allow some reasonable defaults
                    hasHardcodedValues = true;
                    this.results.warnings.push('Possible hardcoded values detected in config');
                    break;
                }
            }

            if (!hasHardcodedValues) {
                console.log('  ✅ Configuration properly externalized');
            }

        } catch (error) {
            this.results.errors.push(`Configuration validation failed: ${error.message}`);
        }
    }

    /**
     * Validate dependencies and environment
     * GI #23: Manage dependencies securely
     */
    async validateDependencies() {
        console.log('\n📦 Validating Dependencies...');

        try {
            const packageFile = path.join(this.basePath, 'package.json');
            if (!fs.existsSync(packageFile)) {
                this.results.errors.push('package.json not found');
                return;
            }

            const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

            // Check for required dependencies
            const requiredDeps = [
                '@coral-xyz/anchor',
                '@solana/web3.js',
                'mocha',
                'chai',
                'ts-node'
            ];

            const allDeps = {
                ...packageData.dependencies || {},
                ...packageData.devDependencies || {}
            };

            for (const dep of requiredDeps) {
                if (allDeps[dep]) {
                    console.log(`  ✅ ${dep} - ${allDeps[dep]}`);
                    this.results.dependencyValidation.push({
                        dependency: dep,
                        version: allDeps[dep],
                        status: 'FOUND'
                    });
                } else {
                    console.log(`  ❌ ${dep} - Missing`);
                    this.results.dependencyValidation.push({
                        dependency: dep,
                        status: 'MISSING'
                    });
                    this.results.errors.push(`Required dependency missing: ${dep}`);
                }
            }

            // Check environment tools
            const requiredTools = [
                { command: 'node --version', name: 'Node.js' },
                { command: 'npm --version', name: 'NPM' },
                { command: 'npx tsc --version', name: 'TypeScript' }
            ];

            for (const tool of requiredTools) {
                try {
                    const version = execSync(tool.command, { encoding: 'utf8' }).trim();
                    console.log(`  ✅ ${tool.name} - ${version}`);
                } catch (error) {
                    console.log(`  ⚠️ ${tool.name} - Not available`);
                    this.results.warnings.push(`${tool.name} not available - may cause issues`);
                }
            }

        } catch (error) {
            this.results.errors.push(`Dependency validation failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive validation report
     * GI #33: Maintain comprehensive documentation
     */
    generateValidationReport() {
        console.log('\n📋 Validation Summary:');
        console.log('-'.repeat(40));

        console.log(`📁 Files: ${this.results.fileValidation.filter(f => f.exists).length}/${this.results.fileValidation.length} found`);
        console.log(`🔍 Syntax: ${this.results.syntaxValidation.filter(s => s.status === 'VALID').length}/${this.results.syntaxValidation.length} valid`);
        console.log(`⚙️ Config: ${this.results.configValidation.filter(c => c.status === 'FOUND').length} sections found`);
        console.log(`📦 Dependencies: ${this.results.dependencyValidation.filter(d => d.status === 'FOUND').length} available`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach(error => console.log(`   • ${error}`));
        }

        if (this.results.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.results.warnings.forEach(warning => console.log(`   • ${warning}`));
        }

        // Save detailed report
        const reportPath = path.join(this.basePath, 'test-artifacts', 'validation-report.json');
        try {
            if (!fs.existsSync(path.dirname(reportPath))) {
                fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            }

            fs.writeFileSync(reportPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                results: this.results,
                summary: {
                    totalErrors: this.results.errors.length,
                    totalWarnings: this.results.warnings.length,
                    isValid: this.results.errors.length === 0
                }
            }, null, 2));

            console.log(`\n📄 Detailed report saved: ${reportPath}`);

        } catch (error) {
            console.warn(`⚠️ Could not save report: ${error.message}`);
        }
    }
}

// CLI execution
if (require.main === module) {
    const validator = new CoreInitTestValidator();
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Validation script error:', error);
        process.exit(1);
    });
}

module.exports = CoreInitTestValidator;
