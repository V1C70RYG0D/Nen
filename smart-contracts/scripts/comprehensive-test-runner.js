#!/usr/bin/env node

/**
 * Comprehensive Smart Contract Test Runner

 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test Configuration - Externalized per GI #18
const TEST_CONFIG = {
    networks: {
        localnet: process.env.LOCALNET_RPC_URL || (() => {

        })(),
        devnet: process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com",
        testnet: process.env.TESTNET_RPC_URL || "https://api.testnet.solana.com"
    },
    testSuites: [
        { name: "Unit Tests", command: "npm run test:unit", critical: true },
        { name: "Integration Tests", command: "npm run test:integration", critical: true },
        { name: "Security Tests", command: "npm run test:security", critical: false },
        { name: "Performance Tests", command: "npm run test:performance", critical: false }
    ],
    coverage: {
        threshold: 80, // Minimum coverage percentage
        outputFormat: ["text", "html", "lcov"]
    },
    artifacts: {
        directory: "./test-artifacts",
        preserve: true
    }
};

class ComprehensiveTestRunner {
    constructor() {
        this.results = {
            totalSuites: 0,
            passedSuites: 0,
            failedSuites: 0,
            criticalFailures: 0,
            startTime: new Date(),
            endTime: null,
            coverage: 0,
            artifacts: []
        };

        this.setupArtifactsDirectory();
    }

    /**
     * Setup artifacts directory for test outputs
     * GI #10: Manage files and repository cleanliness
     */
    setupArtifactsDirectory() {
        if (!fs.existsSync(TEST_CONFIG.artifacts.directory)) {
            fs.mkdirSync(TEST_CONFIG.artifacts.directory, { recursive: true });
        }

        // Clean previous artifacts if not preserving
        if (!TEST_CONFIG.artifacts.preserve) {
            const files = fs.readdirSync(TEST_CONFIG.artifacts.directory);
            files.forEach(file => {
                const filePath = path.join(TEST_CONFIG.artifacts.directory, file);
                if (fs.lstatSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    }

    /**
     * Run all test suites with comprehensive reporting
     * GI #8: 100% test coverage, GI #26: CI/CD integration
     */
    async runAllTests() {
        console.log("🚀 Starting Comprehensive Smart Contract Testing");
        console.log("=" * 60);
        console.log(`📅 Started: ${this.results.startTime.toISOString()}`);
        console.log(`🌐 Network: ${process.env.TEST_NETWORK || 'localnet'}`);
        console.log(`📊 Coverage Threshold: ${TEST_CONFIG.coverage.threshold}%`);
        console.log("=" * 60);

        try {
            // Pre-test validation
            await this.validateEnvironment();

            // Build contracts if needed
            await this.buildContracts();

            // Run test suites
            await this.executeTestSuites();

            // Generate coverage report
            await this.generateCoverageReport();

            // Create comprehensive report
            await this.generateFinalReport();

        } catch (error) {
            console.error("❌ Test runner failed:", error);
            process.exit(1);
        }
    }

    /**
     * Validate test environment prerequisites
     * GI #14: Step-by-step validation
     */
    async validateEnvironment() {
        console.log("\n🔍 Validating Test Environment...");

        // Check Solana CLI
        try {
            await this.runCommand("solana --version");
            console.log("✅ Solana CLI available");
        } catch (error) {
            throw new Error("Solana CLI not found. Please install Solana CLI.");
        }

        // Check Anchor CLI
        try {
            await this.runCommand("anchor --version");
            console.log("✅ Anchor CLI available");
        } catch (error) {
            throw new Error("Anchor CLI not found. Please install Anchor.");
        }

        // Check network connectivity
        const network = process.env.TEST_NETWORK || 'localnet';
        if (network !== 'localnet') {
            try {
                const response = await fetch(TEST_CONFIG.networks[network]);
                if (response.ok) {
                    console.log(`✅ ${network} network accessible`);
                } else {
                    throw new Error(`${network} network not accessible`);
                }
            } catch (error) {
                console.warn(`⚠️ ${network} network check failed:`, error.message);
            }
        }

        // Validate keypairs exist
        const requiredKeypairs = ['authority-keypair.json', 'treasury-keypair.json'];
        for (const keypairFile of requiredKeypairs) {
            const keypairPath = path.join('tests', 'fixtures', keypairFile);
            if (!fs.existsSync(keypairPath)) {
                console.warn(`⚠️ Keypair not found: ${keypairFile} - will be generated during tests`);
            } else {
                console.log(`✅ Keypair found: ${keypairFile}`);
            }
        }

        console.log("✅ Environment validation complete");
    }

    /**
     * Build smart contracts before testing
     * GI #3: Production readiness
     */
    async buildContracts() {
        console.log("\n🔨 Building Smart Contracts...");

        try {
            await this.runCommand("anchor build");
            console.log("✅ Smart contracts built successfully");

            // Verify IDL files exist
            const idlDir = path.join('target', 'idl');
            if (fs.existsSync(idlDir)) {
                const idlFiles = fs.readdirSync(idlDir).filter(f => f.endsWith('.json'));
                console.log(`✅ Generated ${idlFiles.length} IDL files`);
                this.results.artifacts.push(...idlFiles.map(f => `idl/${f}`));
            }

        } catch (error) {
            throw new Error(`Contract build failed: ${error.message}`);
        }
    }

    /**
     * Execute all test suites with detailed reporting
     * GI #15: Error-free working systems
     */
    async executeTestSuites() {
        console.log("\n🧪 Executing Test Suites...");

        for (const suite of TEST_CONFIG.testSuites) {
            this.results.totalSuites++;

            console.log(`\n📋 Running: ${suite.name}`);
            console.log("-" * 40);

            const startTime = Date.now();

            try {
                await this.runCommand(suite.command);

                const duration = Date.now() - startTime;
                this.results.passedSuites++;

                console.log(`✅ ${suite.name} PASSED (${duration}ms)`);

                // Save test output as artifact
                this.results.artifacts.push(`${suite.name.toLowerCase().replace(' ', '-')}.log`);

            } catch (error) {
                const duration = Date.now() - startTime;
                this.results.failedSuites++;

                if (suite.critical) {
                    this.results.criticalFailures++;
                }

                console.log(`❌ ${suite.name} FAILED (${duration}ms)`);
                console.log(`   Error: ${error.message}`);

                // Save error details
                const errorLog = {
                    suite: suite.name,
                    error: error.message,
                    duration,
                    critical: suite.critical,
                    timestamp: new Date().toISOString()
                };

                const errorFile = path.join(TEST_CONFIG.artifacts.directory, `${suite.name.toLowerCase().replace(' ', '-')}-error.json`);
                fs.writeFileSync(errorFile, JSON.stringify(errorLog, null, 2));

                // Stop on critical failures in CI
                if (suite.critical && process.env.CI === 'true') {
                    throw new Error(`Critical test suite failed: ${suite.name}`);
                }
            }
        }
    }

    /**
     * Generate test coverage report
     * GI #8: Achieve 100% test coverage
     */
    async generateCoverageReport() {
        console.log("\n📊 Generating Coverage Report...");

        try {
            await this.runCommand("npm run test:coverage");

            // Parse coverage results if available
            const coverageFile = path.join('coverage', 'coverage-summary.json');
            if (fs.existsSync(coverageFile)) {
                const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
                this.results.coverage = coverage.total?.lines?.pct || 0;

                console.log(`✅ Test Coverage: ${this.results.coverage}%`);

                if (this.results.coverage < TEST_CONFIG.coverage.threshold) {
                    console.warn(`⚠️ Coverage below threshold (${TEST_CONFIG.coverage.threshold}%)`);
                }
            } else {
                console.warn("⚠️ Coverage file not found");
            }

        } catch (error) {
            console.warn("⚠️ Coverage generation failed:", error.message);
        }
    }

    /**
     * Generate comprehensive final report
     * GI #33: Maintain comprehensive documentation
     */
    async generateFinalReport() {
        this.results.endTime = new Date();
        const duration = this.results.endTime - this.results.startTime;

        console.log("\n📋 COMPREHENSIVE TEST REPORT");
        console.log("=" * 60);
        console.log(`📅 Started: ${this.results.startTime.toISOString()}`);
        console.log(`📅 Ended: ${this.results.endTime.toISOString()}`);
        console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
        console.log(`🌐 Network: ${process.env.TEST_NETWORK || 'localnet'}`);
        console.log("");
        console.log("📊 RESULTS SUMMARY:");
        console.log(`   Total Suites: ${this.results.totalSuites}`);
        console.log(`   Passed: ${this.results.passedSuites}`);
        console.log(`   Failed: ${this.results.failedSuites}`);
        console.log(`   Critical Failures: ${this.results.criticalFailures}`);
        console.log(`   Coverage: ${this.results.coverage}%`);
        console.log("");

        // Overall status
        const overallStatus = this.determineOverallStatus();
        console.log(`🎯 OVERALL STATUS: ${overallStatus.icon} ${overallStatus.text}`);

        if (overallStatus.code !== 0) {
            console.log("\n⚠️ ISSUES FOUND:");
            if (this.results.criticalFailures > 0) {
                console.log(`   - ${this.results.criticalFailures} critical test failures`);
            }
            if (this.results.coverage < TEST_CONFIG.coverage.threshold) {
                console.log(`   - Coverage below threshold (${this.results.coverage}% < ${TEST_CONFIG.coverage.threshold}%)`);
            }
        }

        // Save detailed report
        await this.saveDetailedReport();

        // Exit with appropriate code
        process.exit(overallStatus.code);
    }

    /**
     * Determine overall test status
     * GI #15: Error-free, working systems
     */
    determineOverallStatus() {
        if (this.results.criticalFailures > 0) {
            return { icon: "❌", text: "CRITICAL FAILURES", code: 1 };
        }

        if (this.results.failedSuites > 0) {
            return { icon: "⚠️", text: "NON-CRITICAL FAILURES", code: 1 };
        }

        if (this.results.coverage < TEST_CONFIG.coverage.threshold) {
            return { icon: "⚠️", text: "INSUFFICIENT COVERAGE", code: 1 };
        }

        return { icon: "✅", text: "ALL TESTS PASSED", code: 0 };
    }

    /**
     * Save detailed test report as JSON
     * GI #11: Update and refer to documentation
     */
    async saveDetailedReport() {
        const report = {
            ...this.results,
            config: TEST_CONFIG,
            environment: {
                node: process.version,
                platform: process.platform,
                network: process.env.TEST_NETWORK || 'localnet',
                ci: process.env.CI || false
            },
            metadata: {
                version: "1.0.0",
                generated: new Date().toISOString(),
                toolchain: "Anchor + Mocha + Chai"
            }
        };

        const reportFile = path.join(TEST_CONFIG.artifacts.directory, 'test-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

        console.log(`📄 Detailed report saved: ${reportFile}`);

        // Generate markdown summary for CI
        if (process.env.CI === 'true') {
            await this.generateMarkdownSummary(report);
        }
    }

    /**
     * Generate markdown summary for CI/GitHub Actions
     * GI #26: CI/CD integration
     */
    async generateMarkdownSummary(report) {
        const status = this.determineOverallStatus();

        const markdown = `
# 🧪 Smart Contract Test Report

${status.icon} **Status**: ${status.text}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Suites | ${report.totalSuites} |
| Passed | ${report.passedSuites} |
| Failed | ${report.failedSuites} |
| Critical Failures | ${report.criticalFailures} |
| Coverage | ${report.coverage}% |
| Duration | ${Math.round((report.endTime - report.startTime) / 1000)}s |

## 🏗️ Test Suites

${TEST_CONFIG.testSuites.map(suite => {
    const passed = !report.failedSuites; // Simplified for this example
    return `- ${passed ? '✅' : '❌'} ${suite.name}`;
}).join('\n')}

## 📈 Coverage Report

Coverage: ${report.coverage}% (Threshold: ${TEST_CONFIG.coverage.threshold}%)

${report.coverage >= TEST_CONFIG.coverage.threshold ? '✅ Coverage target met' : '⚠️ Coverage below threshold'}

---
*Generated on ${new Date().toISOString()}*
        `;

        const summaryFile = path.join(TEST_CONFIG.artifacts.directory, 'test-summary.md');
        fs.writeFileSync(summaryFile, markdown.trim());

        console.log(`📄 CI summary saved: ${summaryFile}`);
    }

    /**
     * Execute shell command with promise wrapper
     */
    runCommand(command) {
        return new Promise((resolve, reject) => {
            const [cmd, ...args] = command.split(' ');
            const child = spawn(cmd, args, {
                stdio: 'inherit',
                shell: true
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command failed with code ${code}: ${command}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }
}

// Main execution
if (require.main === module) {
    const runner = new ComprehensiveTestRunner();
    runner.runAllTests().catch(console.error);
}

module.exports = ComprehensiveTestRunner;
