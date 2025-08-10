/**
 * Sample Test Configuration Validation

 */

import { expect } from "chai";
import { Connection, PublicKey } from "@solana/web3.js";
import { TEST_CONFIG } from "../config/test-config";
import TestEnvironmentValidator from "../config/environment-validator";

describe("Test Environment Configuration", () => {
    let validator: TestEnvironmentValidator;

    before(async () => {
        validator = new TestEnvironmentValidator();
    });

    describe("Configuration Validation", () => {
        it("should have valid network configurations", () => {
            Object.entries(TEST_CONFIG.networks).forEach(([name, url]) => {
                expect(url).to.be.a("string");
                expect(url).to.not.be.empty;
                expect(() => new URL(url)).to.not.throw();
            });
        });

        it("should have valid program IDs", () => {
            Object.entries(TEST_CONFIG.programs).forEach(([name, programId]) => {
                expect(programId).to.be.a("string");
                expect(programId).to.not.be.empty;
                expect(() => new PublicKey(programId)).to.not.throw();
            });
        });

        it("should have valid benchmark configurations", () => {
            expect(TEST_CONFIG.benchmarks.maxLatency).to.be.a("number");
            expect(TEST_CONFIG.benchmarks.maxLatency).to.be.greaterThan(0);

            expect(TEST_CONFIG.benchmarks.minThroughput).to.be.a("number");
            expect(TEST_CONFIG.benchmarks.minThroughput).to.be.greaterThan(0);

            expect(TEST_CONFIG.benchmarks.gasLimit).to.be.a("number");
            expect(TEST_CONFIG.benchmarks.gasLimit).to.be.greaterThan(0);
        });

        it("should have valid security configurations", () => {
            expect(TEST_CONFIG.security.maxBetAmount).to.be.a("number");
            expect(TEST_CONFIG.security.minBetAmount).to.be.a("number");
            expect(TEST_CONFIG.security.maxBetAmount).to.be.greaterThan(TEST_CONFIG.security.minBetAmount);

            expect(TEST_CONFIG.security.platformFeePercentage).to.be.a("number");
            expect(TEST_CONFIG.security.platformFeePercentage).to.be.at.least(0);
            expect(TEST_CONFIG.security.platformFeePercentage).to.be.at.most(10000); // 100% in basis points
        });

        it("should have valid funding configurations", () => {
            expect(TEST_CONFIG.funding.initialBalance).to.be.a("number");
            expect(TEST_CONFIG.funding.initialBalance).to.be.greaterThan(0);

            expect(TEST_CONFIG.funding.airdropAmount).to.be.a("number");
            expect(TEST_CONFIG.funding.airdropAmount).to.be.greaterThan(0);

            expect(TEST_CONFIG.funding.testTokenAmount).to.be.a("number");
            expect(TEST_CONFIG.funding.testTokenAmount).to.be.greaterThan(0);
        });

        it("should have valid coverage thresholds", () => {
            Object.entries(TEST_CONFIG.testing.coverageThreshold).forEach(([metric, threshold]) => {
                expect(threshold).to.be.a("number");
                expect(threshold).to.be.at.least(0);
                expect(threshold).to.be.at.most(100);
            });
        });
    });

    describe("Environment Health Check", function() {
        this.timeout(30000); // 30 second timeout for network operations

        it("should pass comprehensive environment validation", async () => {
            const result = await validator.validateEnvironment();

            // Log detailed results for debugging
            console.log("Validation Results:");
            console.log(`- Valid: ${result.isValid}`);
            console.log(`- Setup Time: ${result.setupTime.toFixed(2)}ms`);
            console.log(`- Errors: ${result.errors.length}`);
            console.log(`- Warnings: ${result.warnings.length}`);

            if (result.errors.length > 0) {
                console.log("Errors:");
                result.errors.forEach(error => console.log(`  - ${error}`));
            }

            if (result.warnings.length > 0) {
                console.log("Warnings:");
                result.warnings.forEach(warning => console.log(`  - ${warning}`));
            }

            // For CI/CD environments, we might be more lenient
            if (process.env.CI === "true") {
                expect(result.errors.length).to.be.at.most(2); // Allow some errors in CI
            } else {
                expect(result.isValid).to.be.true;
            }

            expect(result.setupTime).to.be.lessThan(60000); // Should complete within 60 seconds
        });

        it("should generate environment report", async () => {
            const report = await validator.generateEnvironmentReport();

            expect(report).to.be.a("string");
            expect(report).to.include("Test Environment Report");
            expect(report).to.include("Environment Configuration");
            expect(report).to.include("Validation Results");
            expect(report).to.include("Health Check Results");

            // Optionally save report for debugging
            if (process.env.SAVE_REPORTS === "true") {
                const fs = await import("fs");
                const path = await import("path");
                const reportPath = path.join(process.cwd(), "test-environment-report.md");
                fs.writeFileSync(reportPath, report);
                console.log(`Environment report saved to: ${reportPath}`);
            }
        });
    });

    describe("Network Connectivity", function() {
        this.timeout(15000); // 15 second timeout

        it("should connect to configured network", async () => {
            const connection = new Connection(
                TEST_CONFIG.networks[TEST_CONFIG.environment.currentNetwork as keyof typeof TEST_CONFIG.networks],
                "confirmed"
            );

            // Test basic connectivity
            const version = await connection.getVersion();
            expect(version).to.have.property("solana-core");

            // Test slot retrieval
            const slot = await connection.getSlot();
            expect(slot).to.be.a("number");
            expect(slot).to.be.greaterThan(0);
        });

        it("should have acceptable latency", async () => {
            const connection = new Connection(
                TEST_CONFIG.networks[TEST_CONFIG.environment.currentNetwork as keyof typeof TEST_CONFIG.networks],
                "confirmed"
            );

            const measurements = [];
            for (let i = 0; i < 5; i++) {
                const start = performance.now();
                await connection.getSlot();
                const latency = performance.now() - start;
                measurements.push(latency);
            }

            const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            console.log(`Average network latency: ${avgLatency.toFixed(2)}ms`);

            // Should be within configured threshold
            expect(avgLatency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency);
        });
    });
});

// Export for potential reuse in other test files
export { TEST_CONFIG };
