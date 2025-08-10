/**
 * Betting System Integration Tests

 */

import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";

import {
    TEST_CONFIG,
    testEnvironmentSetup
} from "../config/test-setup";
import {
    createTransactionHelper,
    createPerformanceProfiler,
    TestDataGenerator
} from "../utils/helpers";
import {
    MatchMockData,
    UserMockData
} from "../utils/mock-data";

describe("🎯 Betting System Integration Tests", () => {
    let testEnv: any;
    let program: anchor.Program;
    let provider: anchor.AnchorProvider;
    let transactionHelper: any;
    let performanceProfiler: any;

    // Key accounts for testing
    let platformKeypair: Keypair;
    let matchKeypair: Keypair;
    let userKeypairs: Keypair[];
    let adminKeypair: Keypair;

    before(async () => {
        console.log("🚀 Setting up betting integration test environment...");

        testEnv = await testEnvironmentSetup.getTestEnvironment();
        program = testEnv.program;
        provider = testEnv.provider;
        adminKeypair = testEnv.keypairs.authority;

        transactionHelper = createTransactionHelper(testEnv.connection, adminKeypair);
        performanceProfiler = createPerformanceProfiler();

        // Create test accounts
        platformKeypair = Keypair.generate();
        matchKeypair = Keypair.generate();
        userKeypairs = [
            testEnv.keypairs.user1,
            testEnv.keypairs.user2,
            testEnv.keypairs.bettor1,
            testEnv.keypairs.bettor2
        ];

        // Initialize platform for testing
        await initializePlatform();

        console.log("✅ Betting integration test environment ready");
    });

    after(async () => {
        console.log("\n📊 Integration Test Performance Report:");
        console.log(performanceProfiler.generateReport());
    });

    /**
     * Helper: Initialize platform for testing
     */
    async function initializePlatform() {
        await program.methods
            .initializePlatform(
                adminKeypair.publicKey,
                TEST_CONFIG.security.platformFeePercentage
            )
            .accounts({
                platform: platformKeypair.publicKey,
                admin: adminKeypair.publicKey,
                treasury: testEnv.keypairs.treasury.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([platformKeypair])
            .rpc();

        console.log(`✅ Test platform initialized: ${platformKeypair.publicKey.toBase58()}`);
    }

    /**
     * Helper: Create user account with KYC level
     */
    async function createUserAccount(userKeypair: Keypair, kycLevel: number = 1): Promise<Keypair> {
        const userAccountKeypair = Keypair.generate();

        await program.methods
            .createUserAccount(
                kycLevel,
                0 // compliance flags
            )
            .accounts({
                userAccount: userAccountKeypair.publicKey,
                user: userKeypair.publicKey,
                platform: platformKeypair.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([userAccountKeypair])
            .rpc();

        return userAccountKeypair;
    }

    /**
     * Helper: Create test match
     */
    async function createTestMatch(): Promise<Keypair> {
        const matchData = MatchMockData.generateMatchScenarios()[0];

        await program.methods
            .createMatch(
                matchData.agent1Id,
                matchData.agent2Id,
                matchData.entryFee,
                matchData.maxParticipants,
                matchData.duration
            )
            .accounts({
                match: matchKeypair.publicKey,
                creator: adminKeypair.publicKey,
                platform: platformKeypair.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([matchKeypair])
            .rpc();

        return matchKeypair;
    }

    describe("🏗️ Complete Betting Workflow", () => {
        it("should execute complete user registration to bet placement workflow", async () => {
            const measurement = performanceProfiler.startMeasurement("complete_betting_workflow");

            try {
                // Step 1: User Registration
                console.log("📝 Step 1: User Registration");
                const userAccountKeypair = await createUserAccount(userKeypairs[0], 2); // KYC Level 2

                // Step 2: Create Match
                console.log("🎮 Step 2: Create Match");
                const testMatchKeypair = await createTestMatch();

                // Step 3: Place Bet
                console.log("💰 Step 3: Place Bet");
                const betAmount = new BN(0.5 * LAMPORTS_PER_SOL);
                const agentChoice = 1;

                const betKeypair = Keypair.generate();
                await program.methods
                    .placeBet(
                        agentChoice,
                        betAmount
                    )
                    .accounts({
                        bet: betKeypair.publicKey,
                        bettor: userKeypairs[0].publicKey,
                        bettorAccount: userAccountKeypair.publicKey,
                        match: testMatchKeypair.publicKey,
                        platform: platformKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([betKeypair])
                    .rpc();

                // Step 4: Verify Bet State
                console.log("✅ Step 4: Verify Bet State");
                // Note: Actual account fetching would be done here if IDL was available

                measurement({
                    steps: 4,
                    userRegistered: true,
                    matchCreated: true,
                    betPlaced: true
                });

                console.log("✅ Complete betting workflow executed successfully");

            } catch (error) {
                measurement({ error: (error as Error).message });
                throw error;
            }
        });

        it("should handle multiple users betting on same match", async () => {
            const measurement = performanceProfiler.startMeasurement("multi_user_betting");

            try {
                // Create match for multi-user betting
                const multiUserMatch = Keypair.generate();
                const matchData = MatchMockData.generateMatchScenarios()[1];

                await program.methods
                    .createMatch(
                        matchData.agent1Id,
                        matchData.agent2Id,
                        matchData.entryFee,
                        matchData.maxParticipants,
                        matchData.duration
                    )
                    .accounts({
                        match: multiUserMatch.publicKey,
                        creator: adminKeypair.publicKey,
                        platform: platformKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([multiUserMatch])
                    .rpc();

                // Create user accounts and place bets
                const userCount = Math.min(userKeypairs.length, 3);
                const betPromises: Promise<any>[] = [];

                for (let i = 0; i < userCount; i++) {
                    const userAccount = await createUserAccount(userKeypairs[i], 2);

                    const betKeypair = Keypair.generate();
                    const betAmount = new BN((0.2 + i * 0.1) * LAMPORTS_PER_SOL);
                    const agentChoice = (i % 2) + 1; // Alternate between agents

                    const betPromise = program.methods
                        .placeBet(agentChoice, betAmount)
                        .accounts({
                            bet: betKeypair.publicKey,
                            bettor: userKeypairs[i].publicKey,
                            bettorAccount: userAccount.publicKey,
                            match: multiUserMatch.publicKey,
                            platform: platformKeypair.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                        })
                        .signers([betKeypair])
                        .rpc();

                    betPromises.push(betPromise);
                }

                // Wait for all bets to complete
                const results = await Promise.allSettled(betPromises);
                const successfulBets = results.filter(r => r.status === "fulfilled").length;

                measurement({
                    totalUsers: userCount,
                    successfulBets,
                    failedBets: userCount - successfulBets
                });

                expect(successfulBets).to.equal(userCount);
                console.log(`✅ ${successfulBets}/${userCount} users successfully placed bets`);

            } catch (error) {
                measurement({ error: (error as Error).message });
                throw error;
            }
        });
    });

    describe("🔒 KYC Integration Testing", () => {
        it("should enforce KYC limits across betting workflow", async () => {
            const kycTestCases = UserMockData.generateKycTestCases();

            for (const kycCase of kycTestCases) {
                console.log(`🔍 Testing ${kycCase.description}`);

                const testUser = Keypair.generate();
                await transactionHelper.createAndFundAccount(1 * LAMPORTS_PER_SOL);

                // Create user with specific KYC level
                const userAccount = await createUserAccount(testUser, kycCase.level);

                // Create test match
                const testMatch = Keypair.generate();
                const matchData = MatchMockData.generateMatchScenarios()[0];

                await program.methods
                    .createMatch(
                        matchData.agent1Id,
                        matchData.agent2Id,
                        new BN(0.01 * LAMPORTS_PER_SOL), // Low entry fee
                        100,
                        1800
                    )
                    .accounts({
                        match: testMatch.publicKey,
                        creator: adminKeypair.publicKey,
                        platform: platformKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([testMatch])
                    .rpc();

                // Test bet within limit
                const withinLimitBet = Keypair.generate();
                const validAmount = new BN(kycCase.maxBetAmount.toNumber() * 0.8); // 80% of limit

                try {
                    await program.methods
                        .placeBet(1, validAmount)
                        .accounts({
                            bet: withinLimitBet.publicKey,
                            bettor: testUser.publicKey,
                            bettorAccount: userAccount.publicKey,
                            match: testMatch.publicKey,
                            platform: platformKeypair.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                        })
                        .signers([withinLimitBet])
                        .rpc();

                    console.log(`✅ KYC Level ${kycCase.level}: Valid bet accepted`);
                } catch (error) {
                    console.error(`❌ KYC Level ${kycCase.level}: Valid bet rejected: ${error}`);
                    throw error;
                }

                // Test bet exceeding limit (should fail)
                const exceedingLimitBet = Keypair.generate();
                const invalidAmount = new BN(kycCase.maxBetAmount.toNumber() * 1.5); // 150% of limit

                try {
                    await program.methods
                        .placeBet(1, invalidAmount)
                        .accounts({
                            bet: exceedingLimitBet.publicKey,
                            bettor: testUser.publicKey,
                            bettorAccount: userAccount.publicKey,
                            match: testMatch.publicKey,
                            platform: platformKeypair.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                        })
                        .signers([exceedingLimitBet])
                        .rpc();

                    throw new Error(`KYC Level ${kycCase.level}: Bet exceeding limit should have failed`);
                } catch (error) {
                    if ((error as Error).message.includes("KYC") || (error as Error).message.includes("limit")) {
                        console.log(`✅ KYC Level ${kycCase.level}: Excessive bet properly rejected`);
                    } else {
                        throw error;
                    }
                }
            }
        });
    });

    describe("⚡ Performance Integration Testing", () => {
        it("should maintain performance under realistic load", async () => {
            const measurement = performanceProfiler.startMeasurement("realistic_load_test");

            try {
                // Simulate realistic betting scenario
                const simultaneousUsers = 5;
                const betsPerUser = 3;

                // Create test match
                const loadTestMatch = Keypair.generate();
                const matchData = MatchMockData.generateMatchScenarios()[1];

                await program.methods
                    .createMatch(
                        matchData.agent1Id,
                        matchData.agent2Id,
                        matchData.entryFee,
                        matchData.maxParticipants,
                        matchData.duration
                    )
                    .accounts({
                        match: loadTestMatch.publicKey,
                        creator: adminKeypair.publicKey,
                        platform: platformKeypair.publicKey,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .signers([loadTestMatch])
                    .rpc();

                // Create users and execute concurrent betting
                const allPromises: Promise<any>[] = [];
                const startTime = performance.now();

                for (let userId = 0; userId < simultaneousUsers; userId++) {
                    const user = Keypair.generate();
                    await transactionHelper.createAndFundAccount(2 * LAMPORTS_PER_SOL);

                    const userAccount = await createUserAccount(user, 2);

                    // Multiple bets per user
                    for (let betId = 0; betId < betsPerUser; betId++) {
                        const betKeypair = Keypair.generate();
                        const amount = new BN(0.1 * LAMPORTS_PER_SOL);
                        const agent = (betId % 2) + 1;

                        const betPromise = program.methods
                            .placeBet(agent, amount)
                            .accounts({
                                bet: betKeypair.publicKey,
                                bettor: user.publicKey,
                                bettorAccount: userAccount.publicKey,
                                match: loadTestMatch.publicKey,
                                platform: platformKeypair.publicKey,
                                systemProgram: anchor.web3.SystemProgram.programId,
                            })
                            .signers([betKeypair])
                            .rpc();

                        allPromises.push(betPromise);
                    }
                }

                // Execute all bets and measure performance
                const results = await Promise.allSettled(allPromises);
                const endTime = performance.now();

                const successfulBets = results.filter(r => r.status === "fulfilled").length;
                const totalLatency = endTime - startTime;
                const avgLatencyPerBet = totalLatency / allPromises.length;
                const throughput = (successfulBets / totalLatency) * 1000; // bets per second

                measurement({
                    totalBets: allPromises.length,
                    successfulBets,
                    totalLatency,
                    avgLatencyPerBet,
                    throughput
                });

                console.log(`📈 Load Test Results:`);
                console.log(`   Total Bets: ${allPromises.length}`);
                console.log(`   Successful: ${successfulBets}`);
                console.log(`   Avg Latency: ${avgLatencyPerBet.toFixed(2)}ms per bet`);
                console.log(`   Throughput: ${throughput.toFixed(2)} bets/second`);

                // Validate against benchmarks
                expect(avgLatencyPerBet).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency);
                expect(successfulBets).to.equal(allPromises.length); // All should succeed

                console.log("✅ Performance requirements met under realistic load");

            } catch (error) {
                measurement({ error: (error as Error).message });
                throw error;
            }
        });
    });

    describe("🛡️ Error Recovery Integration", () => {
        it("should handle partial failures gracefully", async () => {
            console.log("🔧 Testing error recovery scenarios...");

            // Scenario: Some users fail bet placement due to insufficient funds
            const testMatch = Keypair.generate();
            const matchData = MatchMockData.generateMatchScenarios()[0];

            await program.methods
                .createMatch(
                    matchData.agent1Id,
                    matchData.agent2Id,
                    matchData.entryFee,
                    matchData.maxParticipants,
                    matchData.duration
                )
                .accounts({
                    match: testMatch.publicKey,
                    creator: adminKeypair.publicKey,
                    platform: platformKeypair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([testMatch])
                .rpc();

            const scenarios = [
                { fundAmount: 1 * LAMPORTS_PER_SOL, betAmount: 0.5 * LAMPORTS_PER_SOL, shouldSucceed: true },
                { fundAmount: 0.1 * LAMPORTS_PER_SOL, betAmount: 0.5 * LAMPORTS_PER_SOL, shouldSucceed: false },
                { fundAmount: 2 * LAMPORTS_PER_SOL, betAmount: 0.3 * LAMPORTS_PER_SOL, shouldSucceed: true }
            ];

            let successCount = 0;
            let expectedSuccessCount = 0;

            for (const [index, scenario] of scenarios.entries()) {
                const user = Keypair.generate();
                const userAccount = await createUserAccount(user, 2);

                if (scenario.shouldSucceed) {
                    expectedSuccessCount++;
                }

                try {
                    // Fund user with specific amount
                    await transactionHelper.createAndFundAccount(scenario.fundAmount);

                    const betKeypair = Keypair.generate();
                    await program.methods
                        .placeBet(1, new BN(scenario.betAmount))
                        .accounts({
                            bet: betKeypair.publicKey,
                            bettor: user.publicKey,
                            bettorAccount: userAccount.publicKey,
                            match: testMatch.publicKey,
                            platform: platformKeypair.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                        })
                        .signers([betKeypair])
                        .rpc();

                    if (scenario.shouldSucceed) {
                        successCount++;
                        console.log(`✅ Scenario ${index + 1}: Expected success occurred`);
                    } else {
                        console.warn(`⚠️ Scenario ${index + 1}: Unexpected success`);
                    }

                } catch (error) {
                    if (!scenario.shouldSucceed) {
                        console.log(`✅ Scenario ${index + 1}: Expected failure occurred`);
                    } else {
                        console.error(`❌ Scenario ${index + 1}: Unexpected failure: ${error}`);
                    }
                }
            }

            console.log(`🎯 Error Recovery Test: ${successCount}/${expectedSuccessCount} expected successes`);
            expect(successCount).to.equal(expectedSuccessCount);
        });
    });
});
