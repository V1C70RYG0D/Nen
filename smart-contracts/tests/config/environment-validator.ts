/**
 * Test Environment Configuration Validator and Setup

 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { TEST_CONFIG, ConfigValidator, EnvironmentHealthChecker } from "./test-config";
import { TestDataManager } from "../utils/enhanced-helpers";

/**
 * Comprehensive Test Environment Setup and Validation
 * GI #8: Test extensively at every stage
 */
export class TestEnvironmentValidator {
    private connection: Connection;
    private healthChecker: EnvironmentHealthChecker;
    private dataManager: TestDataManager;

    constructor() {
        const networkUrl = TEST_CONFIG.networks[TEST_CONFIG.environment.currentNetwork as keyof typeof TEST_CONFIG.networks];
        this.connection = new Connection(networkUrl, {
            commitment: "confirmed",
            confirmTransactionInitialTimeout: TEST_CONFIG.environment.testTimeout,
        });
        this.healthChecker = new EnvironmentHealthChecker(this.connection);
        this.dataManager = new TestDataManager();
    }

    /**
     * Validate complete test environment setup
     * GI #15: Error-free, working systems
     */
    async validateEnvironment(): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
        healthCheck: any;
        setupTime: number;
    }> {
        const startTime = performance.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        console.log("🔍 Starting comprehensive environment validation...");

        try {
            // 1. Validate configuration
            console.log("📋 Validating configuration...");
            ConfigValidator.validateConfig();
            console.log("✅ Configuration validation passed");

        } catch (error) {
            errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // 2. Validate network connectivity and health
        console.log("🌐 Checking network health...");
        let healthCheck;
        try {
            healthCheck = await this.healthChecker.performHealthCheck();

            const failedChecks = healthCheck.checks.filter(check => check.status === "fail");
            const warnChecks = healthCheck.checks.filter(check => check.status === "warn");

            failedChecks.forEach(check => {
                errors.push(`Health check failed: ${check.name} - ${check.message}`);
            });

            warnChecks.forEach(check => {
                warnings.push(`Health check warning: ${check.name} - ${check.message}`);
            });

            if (healthCheck.isHealthy) {
                console.log("✅ Network health check passed");
            } else {
                console.log("⚠️ Network health check has issues");
            }

        } catch (error) {
            errors.push(`Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            healthCheck = { isHealthy: false, checks: [] };
        }

        // 3. Validate test keypairs
        console.log("🔑 Validating test keypairs...");
        try {
            await this.validateTestKeypairs();
            console.log("✅ Test keypairs validation passed");
        } catch (error) {
            errors.push(`Keypair validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // 4. Validate program deployments
        console.log("📦 Validating program deployments...");
        try {
            await this.validateProgramDeployments();
            console.log("✅ Program deployment validation passed");
        } catch (error) {
            errors.push(`Program deployment validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // 5. Validate test accounts funding
        console.log("💰 Validating test account funding...");
        try {
            await this.validateTestAccountFunding();
            console.log("✅ Test account funding validation passed");
        } catch (error) {
            warnings.push(`Test account funding validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // 6. Validate test data fixtures
        console.log("📄 Validating test fixtures...");
        try {
            this.validateTestFixtures();
            console.log("✅ Test fixtures validation passed");
        } catch (error) {
            warnings.push(`Test fixtures validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // 7. Performance baseline validation
        console.log("⚡ Running performance baseline validation...");
        try {
            await this.validatePerformanceBaseline();
            console.log("✅ Performance baseline validation passed");
        } catch (error) {
            warnings.push(`Performance validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        const setupTime = performance.now() - startTime;
        const isValid = errors.length === 0;

        // Summary
        console.log("\n📊 Validation Summary:");
        console.log(`✅ Validation ${isValid ? "PASSED" : "FAILED"}`);
        console.log(`⏱️  Setup time: ${setupTime.toFixed(2)}ms`);
        console.log(`🔴 Errors: ${errors.length}`);
        console.log(`🟡 Warnings: ${warnings.length}`);

        if (errors.length > 0) {
            console.log("\n🔴 Errors:");
            errors.forEach(error => console.log(`  - ${error}`));
        }

        if (warnings.length > 0) {
            console.log("\n🟡 Warnings:");
            warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        return {
            isValid,
            errors,
            warnings,
            healthCheck,
            setupTime
        };
    }

    /**
     * Validate all test keypairs exist and are properly formatted
     * GI #13: Secure optimization
     */
    private async validateTestKeypairs(): Promise<void> {
        const keypairNames = Object.keys(TEST_CONFIG.testWallets);
        const validationErrors: string[] = [];

        for (const name of keypairNames) {
            const filename = TEST_CONFIG.testWallets[name as keyof typeof TEST_CONFIG.testWallets];

            try {
                if (!ConfigValidator.validateKeypairFile(filename)) {
                    validationErrors.push(`Invalid keypair file: ${filename}`);
                    continue;
                }

                // Additional validation: ensure keypair can be loaded
                const keypair = this.dataManager.loadKeypair(filename);

                // Validate public key format
                if (!PublicKey.isOnCurve(keypair.publicKey.toBytes())) {
                    validationErrors.push(`Invalid public key for ${name}: ${keypair.publicKey.toBase58()}`);
                }

            } catch (error) {
                validationErrors.push(`Keypair validation failed for ${name}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        if (validationErrors.length > 0) {
            throw new Error(`Keypair validation failed:\n${validationErrors.join('\n')}`);
        }
    }

    /**
     * Validate program deployments on the target network
     * GI #2: Real implementations
     */
    private async validateProgramDeployments(): Promise<void> {
        const programIds = Object.values(TEST_CONFIG.programs);
        const validationErrors: string[] = [];

        for (const [name, programId] of Object.entries(TEST_CONFIG.programs)) {
            try {
                const pubkey = new PublicKey(programId);
                const accountInfo = await this.connection.getAccountInfo(pubkey);

                if (!accountInfo) {
                    validationErrors.push(`Program ${name} not deployed: ${programId}`);
                    continue;
                }

                if (!accountInfo.executable) {
                    validationErrors.push(`Program ${name} is not executable: ${programId}`);
                    continue;
                }

                // Additional validation: check if it's a valid program account
                const expectedOwner = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
                if (!accountInfo.owner.equals(expectedOwner)) {
                    validationErrors.push(`Program ${name} has unexpected owner: ${accountInfo.owner.toBase58()}`);
                }

            } catch (error) {
                validationErrors.push(`Program validation failed for ${name}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        if (validationErrors.length > 0) {
            throw new Error(`Program deployment validation failed:\n${validationErrors.join('\n')}`);
        }
    }

    /**
     * Validate test accounts have sufficient funding
     * GI #6: Handle integrations carefully
     */
    private async validateTestAccountFunding(): Promise<void> {
        const requiredBalance = TEST_CONFIG.funding.initialBalance * LAMPORTS_PER_SOL;
        const validationErrors: string[] = [];
        const warnings: string[] = [];

        for (const [name, filename] of Object.entries(TEST_CONFIG.testWallets)) {
            try {
                const keypair = this.dataManager.loadKeypair(filename);
                const balance = await this.connection.getBalance(keypair.publicKey);

                if (balance < requiredBalance) {
                    if (TEST_CONFIG.environment.currentNetwork === "localnet") {
                        // For localnet, we can airdrop
                        warnings.push(`Account ${name} underfunded (${balance / LAMPORTS_PER_SOL} SOL < ${TEST_CONFIG.funding.initialBalance} SOL) - will airdrop`);

                        try {
                            await this.connection.requestAirdrop(
                                keypair.publicKey,
                                requiredBalance - balance
                            );
                        } catch (airdropError) {
                            validationErrors.push(`Failed to airdrop to ${name}: ${airdropError instanceof Error ? airdropError.message : "Unknown error"}`);
                        }
                    } else {
                        validationErrors.push(`Account ${name} underfunded: ${balance / LAMPORTS_PER_SOL} SOL < ${TEST_CONFIG.funding.initialBalance} SOL`);
                    }
                }

            } catch (error) {
                validationErrors.push(`Funding validation failed for ${name}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        if (validationErrors.length > 0) {
            throw new Error(`Account funding validation failed:\n${validationErrors.join('\n')}`);
        }

        if (warnings.length > 0) {
            console.log("⚠️ Funding warnings:");
            warnings.forEach(warning => console.log(`  - ${warning}`));
        }
    }

    /**
     * Validate test fixture files
     * GI #17: Generalize for reusability
     */
    private validateTestFixtures(): void {
        const requiredFixtures = [
            "accounts.json"
        ];

        const validationErrors: string[] = [];

        for (const fixture of requiredFixtures) {
            try {
                const data = this.dataManager.loadFixture(fixture);

                // Basic structure validation for accounts.json
                if (fixture === "accounts.json") {
                    const accountsData = data as any;
                    if (!accountsData.testAccounts || !accountsData.userAccounts) {
                        validationErrors.push(`Invalid structure in ${fixture}: missing required sections`);
                    }
                }

            } catch (error) {
                validationErrors.push(`Fixture validation failed for ${fixture}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        if (validationErrors.length > 0) {
            throw new Error(`Fixture validation failed:\n${validationErrors.join('\n')}`);
        }
    }

    /**
     * Validate performance baseline
     * GI #21: Performance optimization
     */
    private async validatePerformanceBaseline(): Promise<void> {
        const measurements = [];
        const iterations = 5;

        // Measure basic RPC call latency
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await this.connection.getSlot();
            const latency = performance.now() - start;
            measurements.push(latency);
        }

        const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const maxLatency = TEST_CONFIG.benchmarks.maxLatency;

        if (avgLatency > maxLatency) {
            throw new Error(`Performance baseline failed: Average latency ${avgLatency.toFixed(2)}ms exceeds threshold ${maxLatency}ms`);
        }

        console.log(`📊 Performance baseline: ${avgLatency.toFixed(2)}ms avg latency`);
    }

    /**
     * Generate test environment report
     * GI #33: Documentation
     */
    async generateEnvironmentReport(): Promise<string> {
        const validation = await this.validateEnvironment();
        const networkInfo = await this.connection.getVersion();

        const report = `# Test Environment Report

## Environment Configuration
- **Network**: ${TEST_CONFIG.environment.currentNetwork}
- **Solana Version**: ${networkInfo["solana-core"]}
- **Commitment Level**: confirmed
- **Test Timeout**: ${TEST_CONFIG.environment.testTimeout}ms

## Validation Results
- **Status**: ${validation.isValid ? "✅ VALID" : "❌ INVALID"}
- **Setup Time**: ${validation.setupTime.toFixed(2)}ms
- **Errors**: ${validation.errors.length}
- **Warnings**: ${validation.warnings.length}

## Health Check Results
${validation.healthCheck.checks.map((check: any) =>
    `- **${check.name}**: ${check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : "❌"} ${check.message}${check.latency ? ` (${check.latency.toFixed(2)}ms)` : ""}`
).join('\n')}

## Configuration Summary
- **Max Latency**: ${TEST_CONFIG.benchmarks.maxLatency}ms
- **Min Throughput**: ${TEST_CONFIG.benchmarks.minThroughput} tx/s
- **Gas Limit**: ${TEST_CONFIG.benchmarks.gasLimit}
- **Test Accounts**: ${Object.keys(TEST_CONFIG.testWallets).length}
- **Programs**: ${Object.keys(TEST_CONFIG.programs).length}

${validation.errors.length > 0 ? `## Errors\n${validation.errors.map(e => `- ${e}`).join('\n')}` : ''}
${validation.warnings.length > 0 ? `## Warnings\n${validation.warnings.map(w => `- ${w}`).join('\n')}` : ''}

---
*Generated at ${new Date().toISOString()}*
`;

        return report;
    }
}

export default TestEnvironmentValidator;
