/**
 * Platform Initialization Tests

 */

import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";

import {
    TEST_CONFIG,
    TestEnvironmentSetup,
    testEnvironmentSetup
} from "../config/test-setup";
import {
    createTransactionHelper,
    createAccountValidator,
    createPerformanceProfiler,
    createSecurityTester,
    TestDataGenerator
} from "../utils/helpers";
import { PlatformMockData } from "../utils/mock-data";

describe("🏗️ Platform Initialization Tests", () => {
    let testEnv: any;
    let program: anchor.Program;
    let provider: anchor.AnchorProvider;
    let platformKeypair: Keypair;
    let adminKeypair: Keypair;
    let treasuryKeypair: Keypair;
    let transactionHelper: any;
    let accountValidator: any;
    let performanceProfiler: any;
    let securityTester: any;

    // Test context setup following GI #15: Error-free, working systems
    before(async () => {
        console.log("🚀 Setting up comprehensive test environment...");

        try {
            testEnv = await testEnvironmentSetup.getTestEnvironment();
            program = testEnv.program;
            provider = testEnv.provider;

            // Get test keypairs
            adminKeypair = testEnv.keypairs.authority;
            treasuryKeypair = testEnv.keypairs.treasury;
            platformKeypair = Keypair.generate();

            // Initialize utility classes
            transactionHelper = createTransactionHelper(testEnv.connection, adminKeypair);
            accountValidator = createAccountValidator(testEnv.connection);
            performanceProfiler = createPerformanceProfiler();
            securityTester = createSecurityTester(testEnv.connection);

            console.log("✅ Test environment ready");
            console.log(`📝 Admin: ${adminKeypair.publicKey.toBase58()}`);
            console.log(`🏦 Treasury: ${treasuryKeypair.publicKey.toBase58()}`);
            console.log(`🏛️ Platform: ${platformKeypair.publicKey.toBase58()}`);

        } catch (error) {
            console.error("❌ Test environment setup failed:", error);
            throw error;
        }
    });

    after(async () => {
        console.log("\n📊 Test Performance Report:");
        console.log(performanceProfiler.generateReport());

        await testEnvironmentSetup.cleanup();
    });

    describe("✅ Valid Platform Initialization", () => {
        it("should initialize platform with valid parameters", async () => {
            const measurement = performanceProfiler.startMeasurement("platform_init_valid");

            try {
                const platformConfig = PlatformMockData.generatePlatformConfig();

                // Execute platform initialization
                const tx = await program.methods
                    .initializePlatform(
                        adminKeypair.publicKey,
                        platformConfig.platformFeePercentage
                    )
                    .accounts({
                        platform: platformKeypair.publicKey,
                        admin: adminKeypair.publicKey,
                        treasury: treasuryKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([platformKeypair])
                    .rpc();

                console.log(`✅ Platform initialized: ${tx}`);
                measurement();

                // Validate platform account state
                await accountValidator.validateProgramAccount(
                    program,
                    "platform",
                    platformKeypair.publicKey,
                    {
                        adminAuthority: adminKeypair.publicKey,
                        platformFeePercentage: platformConfig.platformFeePercentage,
                        totalMatches: new BN(0),
                        totalBets: new BN(0),
                        totalVolume: new BN(0),
                        isPaused: false
                    }
                );

                console.log("✅ Platform account state validated");

            } catch (error) {
                measurement({ error: (error as Error).message });
                throw error;
            }
        });

        it("should handle different fee percentages correctly", async () => {
            const testCases = [
                { fee: 0, description: "Zero fee" },
                { fee: 100, description: "1% fee" },
                { fee: 250, description: "2.5% fee (default)" },
                { fee: 500, description: "5% fee" },
                { fee: 1000, description: "10% fee (maximum)" }
            ];

            for (const testCase of testCases) {
                const measurement = performanceProfiler.startMeasurement(`platform_init_fee_${testCase.fee}`);
                const testPlatformKeypair = Keypair.generate();

                try {
                    await program.methods
                        .initializePlatform(
                            adminKeypair.publicKey,
                            testCase.fee
                        )
                        .accounts({
                            platform: testPlatformKeypair.publicKey,
                            admin: adminKeypair.publicKey,
                            treasury: treasuryKeypair.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                        })
                        .signers([testPlatformKeypair])
                        .rpc();

                    // Validate fee was set correctly
                    const platformAccount = await (program.account as any).platform.fetch(testPlatformKeypair.publicKey);
                    expect(platformAccount.platformFeePercentage).to.equal(testCase.fee);

                    console.log(`✅ ${testCase.description}: Fee set to ${testCase.fee} basis points`);
                    measurement();

                } catch (error) {
                    measurement({ error: (error as Error).message });
                    throw new Error(`Failed ${testCase.description}: ${(error as Error).message}`);
                }
            }
        });
    });

    describe("❌ Invalid Platform Initialization", () => {
        it("should reject initialization with excessive fee percentage", async () => {
            const measurement = performanceProfiler.startMeasurement("platform_init_invalid_fee");
            const testPlatformKeypair = Keypair.generate();

            try {
                await program.methods
                    .initializePlatform(
                        adminKeypair.publicKey,
                        1001 // > 10% maximum
                    )
                    .accounts({
                        platform: testPlatformKeypair.publicKey,
                        admin: adminKeypair.publicKey,
                        treasury: treasuryKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([testPlatformKeypair])
                    .rpc();

                // Should not reach here
                measurement({ error: "Should have failed but didn't" });
                throw new Error("Expected transaction to fail with excessive fee");

            } catch (error) {
                measurement();
                // Verify it's the expected error
                expect((error as Error).message).to.include("InvalidFeePercentage");
                console.log("✅ Excessive fee properly rejected");
            }
        });

        it("should reject duplicate platform initialization", async () => {
            const measurement = performanceProfiler.startMeasurement("platform_init_duplicate");

            try {
                // Try to initialize the same platform account again
                await program.methods
                    .initializePlatform(
                        adminKeypair.publicKey,
                        250
                    )
                    .accounts({
                        platform: platformKeypair.publicKey, // Same account as first test
                        admin: adminKeypair.publicKey,
                        treasury: treasuryKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([])  // Platform already initialized, no signer needed
                    .rpc();

                measurement({ error: "Should have failed but didn't" });
                throw new Error("Expected transaction to fail with duplicate initialization");

            } catch (error) {
                measurement();
                // Should fail because account already exists
                expect((error as Error).message).to.include("already in use");
                console.log("✅ Duplicate initialization properly rejected");
            }
        });
    });

    describe("🔒 Security Validation", () => {
        it("should prevent unauthorized platform administration", async () => {
            const unauthorizedUser = Keypair.generate();
            const testPlatformKeypair = Keypair.generate();

            // Fund unauthorized user for transaction fees
            await transactionHelper.createAndFundAccount(0.1 * LAMPORTS_PER_SOL);

            const result = await securityTester.testUnauthorizedAccess(
                program,
                "initializePlatform",
                adminKeypair,
                unauthorizedUser,
                {
                    platform: testPlatformKeypair.publicKey,
                    admin: unauthorizedUser.publicKey, // Unauthorized admin
                    treasury: treasuryKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                [adminKeypair.publicKey, 250]
            );

            expect(result).to.be.false; // Should properly reject unauthorized access
            console.log("✅ Unauthorized platform administration blocked");
        });

        it("should validate input parameters comprehensively", async () => {
            const testPlatformKeypair = Keypair.generate();

            const result = await securityTester.testInputValidation(
                program,
                "initializePlatform",
                adminKeypair,
                {
                    platform: testPlatformKeypair.publicKey,
                    admin: adminKeypair.publicKey,
                    treasury: treasuryKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
                [adminKeypair.publicKey, 250], // Valid args
                [
                    {
                        args: [PublicKey.default, 250], // Invalid admin (zero address)
                        expectedError: "Invalid"
                    },
                    {
                        args: [adminKeypair.publicKey, -1], // Negative fee
                        expectedError: "Invalid"
                    },
                    {
                        args: [adminKeypair.publicKey, 10001], // Excessive fee
                        expectedError: "InvalidFeePercentage"
                    }
                ]
            );

            expect(result).to.be.true;
            console.log("✅ Input validation working correctly");
        });
    });

    describe("⚡ Performance Benchmarks", () => {
        it("should meet platform initialization latency requirements", async () => {
            const iterations = 5;
            const latencies: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const measurement = performanceProfiler.startMeasurement(`platform_init_benchmark_${i}`);
                const testPlatformKeypair = Keypair.generate();

                const startTime = performance.now();

                await program.methods
                    .initializePlatform(
                        adminKeypair.publicKey,
                        250
                    )
                    .accounts({
                        platform: testPlatformKeypair.publicKey,
                        admin: adminKeypair.publicKey,
                        treasury: treasuryKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([testPlatformKeypair])
                    .rpc();

                const latency = performance.now() - startTime;
                latencies.push(latency);
                measurement({ latency });
            }

            const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
            const maxLatency = Math.max(...latencies);

            console.log(`📈 Platform Init Performance:`);
            console.log(`   Average: ${avgLatency.toFixed(2)}ms`);
            console.log(`   Maximum: ${maxLatency.toFixed(2)}ms`);
            console.log(`   Benchmark: ${TEST_CONFIG.benchmarks.maxLatency}ms`);

            expect(avgLatency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency);
            expect(maxLatency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency * 1.5); // Allow 50% variance for max
        });

        it("should handle concurrent initialization attempts gracefully", async () => {
            const concurrentUsers = 3;
            const promises: Promise<any>[] = [];

            for (let i = 0; i < concurrentUsers; i++) {
                const testPlatformKeypair = Keypair.generate();

                const promise = program.methods
                    .initializePlatform(
                        adminKeypair.publicKey,
                        250
                    )
                    .accounts({
                        platform: testPlatformKeypair.publicKey,
                        admin: adminKeypair.publicKey,
                        treasury: treasuryKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([testPlatformKeypair])
                    .rpc();

                promises.push(promise);
            }

            // All should succeed (different platform accounts)
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === "fulfilled").length;

            expect(successful).to.equal(concurrentUsers);
            console.log(`✅ ${successful}/${concurrentUsers} concurrent initializations succeeded`);
        });
    });

    describe("🧪 Edge Cases and Boundary Testing", () => {
        it("should handle edge case values correctly", async () => {
            const edgeCases = TestDataGenerator.generateEdgeCases();

            // Test minimum values
            const minPlatformKeypair = Keypair.generate();
            await program.methods
                .initializePlatform(
                    adminKeypair.publicKey,
                    edgeCases.minValues.percentage
                )
                .accounts({
                    platform: minPlatformKeypair.publicKey,
                    admin: adminKeypair.publicKey,
                    treasury: treasuryKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([minPlatformKeypair])
                .rpc();

            // Test maximum values
            const maxPlatformKeypair = Keypair.generate();
            await program.methods
                .initializePlatform(
                    adminKeypair.publicKey,
                    edgeCases.maxValues.percentage
                )
                .accounts({
                    platform: maxPlatformKeypair.publicKey,
                    admin: adminKeypair.publicKey,
                    treasury: treasuryKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([maxPlatformKeypair])
                .rpc();

            console.log("✅ Edge case values handled correctly");
        });

        it("should maintain state consistency under stress", async () => {
            // Create multiple platforms rapidly
            const stressCount = 10;
            const platforms: Keypair[] = [];

            const measurement = performanceProfiler.startMeasurement("stress_test_platform_init");

            for (let i = 0; i < stressCount; i++) {
                const testPlatformKeypair = Keypair.generate();
                platforms.push(testPlatformKeypair);

                await program.methods
                    .initializePlatform(
                        adminKeypair.publicKey,
                        250 + i // Slightly different fees
                    )
                    .accounts({
                        platform: testPlatformKeypair.publicKey,
                        admin: adminKeypair.publicKey,
                        treasury: treasuryKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([testPlatformKeypair])
                    .rpc();
            }

            measurement({ platformsCreated: stressCount });

            // Verify all platforms exist and have correct state
            for (let i = 0; i < platforms.length; i++) {
                const platformAccount = await (program.account as any).platform.fetch(platforms[i].publicKey);
                expect(platformAccount.platformFeePercentage).to.equal(250 + i);
                expect(platformAccount.adminAuthority.toBase58()).to.equal(adminKeypair.publicKey.toBase58());
            }

            console.log(`✅ ${stressCount} platforms created and verified under stress`);
        });
    });
});
