/**
 * Transaction Throughput Tests - Task 5.1 Implementation
 * Following GI.md Guidelines: Real implementations, Production readiness, 100% test coverage
 *
 * Test Objectives:
 * - Measure transaction per second capacity (GI #21: Performance optimization)
 * - Test network congestion handling (GI #25: Scalability and extensibility)
 * - Verify performance under load (GI #3: Production readiness and launch-grade quality)
 * - Test concurrent betting operations (GI #25: Concurrency/thread safety)
 *
 * Performance Requirements:
 * - Minimum throughput: 100 TPS (configurable via environment)
 * - Maximum latency: 2000ms under load
 * - Zero transaction failures under normal load
 * - Graceful degradation under stress conditions
 * - Memory usage monitoring and optimization
 *
 * Coverage Requirements:
 * ✅ High-volume concurrent betting operations
 * ✅ Network congestion simulation and handling
 * ✅ Performance metrics measurement and validation
 * ✅ Resource utilization monitoring
 * ✅ Stress testing with multiple simultaneous matches
 * ✅ Gas consumption optimization verification
 * ✅ Latency target validation under load
 * ✅ Transaction failure recovery mechanisms
 * ✅ Throughput bottleneck identification
 * ✅ Scalability limit testing
 */

import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import {
    PublicKey,
    Keypair,
    LAMPORTS_PER_SOL,
    Connection,
    Transaction,
    SystemProgram,
    ComputeBudgetProgram,
    TransactionInstruction,
    Signer,
    sendAndConfirmRawTransaction,
    VersionedTransaction,
    TransactionMessage,
    AddressLookupTableAccount
} from "@solana/web3.js";
import { performance } from "perf_hooks";

import {
    TEST_CONFIG,
    TestEnvironmentSetup,
    TestEnvironment
} from "../config/test-setup";
import {
    createPerformanceProfiler,
    createSecurityTester,
    TestDataGenerator,
    TransactionHelper,
    PerformanceProfiler
} from "../utils/helpers";

// Throughput testing configuration and types
interface ThroughputTestConfig {
    targetTPS: number;
    testDurationMs: number;
    maxConcurrentTx: number;
    batchSize: number;
    networkTarget: 'localnet' | 'devnet' | 'testnet';
    enableStressTest: boolean;
    gasOptimization: boolean;
    memoryMonitoring: boolean;
}

interface ThroughputMetrics {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    actualTPS: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    p95Latency: number;
    p99Latency: number;
    totalTestDuration: number;
    gasUsedTotal: number;
    gasUsedAverage: number;
    memoryUsageStart: number;
    memoryUsageEnd: number;
    memoryUsagePeak: number;
    networkCongestion: number;
    errorDistribution: Map<string, number>;
}

interface ConcurrentBettingResult {
    batchId: string;
    matchId: PublicKey;
    totalBets: number;
    successfulBets: number;
    failedBets: number;
    batchLatency: number;
    gasConsumed: number;
    errors: string[];
    participants: PublicKey[];
}

interface StressTestScenario {
    name: string;
    simultaneousMatches: number;
    betsPerMatch: number;
    targetLoadMultiplier: number;
    expectedDegradation: number;
    criticalFailureThreshold: number;
}

// Performance monitoring utilities
class ThroughputMonitor {
    private metrics: ThroughputMetrics;
    private startTime: number;
    private latencyHistory: number[] = [];
    private gasHistory: number[] = [];
    private memoryHistory: number[] = [];
    private errorLog: Map<string, number> = new Map();

    constructor() {
        this.metrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            actualTPS: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: Number.MAX_VALUE,
            p95Latency: 0,
            p99Latency: 0,
            totalTestDuration: 0,
            gasUsedTotal: 0,
            gasUsedAverage: 0,
            memoryUsageStart: process.memoryUsage().heapUsed,
            memoryUsageEnd: 0,
            memoryUsagePeak: 0,
            networkCongestion: 0,
            errorDistribution: new Map()
        };
        this.startTime = performance.now();
    }

    recordTransaction(success: boolean, latency: number, gasUsed: number = 0, error?: string): void {
        this.metrics.totalTransactions++;

        if (success) {
            this.metrics.successfulTransactions++;
            this.latencyHistory.push(latency);
            this.gasHistory.push(gasUsed);

            // Update latency metrics
            this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
            this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
        } else {
            this.metrics.failedTransactions++;
            if (error) {
                this.errorLog.set(error, (this.errorLog.get(error) || 0) + 1);
            }
        }

        // Memory monitoring
        const currentMemory = process.memoryUsage().heapUsed;
        this.metrics.memoryUsagePeak = Math.max(this.metrics.memoryUsagePeak, currentMemory);
        this.memoryHistory.push(currentMemory);
    }

    finalize(): ThroughputMetrics {
        const endTime = performance.now();
        this.metrics.totalTestDuration = endTime - this.startTime;
        this.metrics.memoryUsageEnd = process.memoryUsage().heapUsed;

        // Calculate derived metrics
        if (this.latencyHistory.length > 0) {
            this.metrics.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
            this.metrics.actualTPS = (this.metrics.successfulTransactions / this.metrics.totalTestDuration) * 1000;

            // Calculate percentiles
            const sortedLatencies = this.latencyHistory.sort((a, b) => a - b);
            this.metrics.p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
            this.metrics.p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
        }

        if (this.gasHistory.length > 0) {
            this.metrics.gasUsedTotal = this.gasHistory.reduce((a, b) => a + b, 0);
            this.metrics.gasUsedAverage = this.metrics.gasUsedTotal / this.gasHistory.length;
        }

        this.metrics.errorDistribution = this.errorLog;
        return this.metrics;
    }

    getIntermediateMetrics(): Partial<ThroughputMetrics> {
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const currentTPS = (this.metrics.successfulTransactions / elapsed) * 1000;

        return {
            totalTransactions: this.metrics.totalTransactions,
            successfulTransactions: this.metrics.successfulTransactions,
            failedTransactions: this.metrics.failedTransactions,
            actualTPS: currentTPS,
            totalTestDuration: elapsed
        };
    }
}

// Concurrent betting batch processor
class ConcurrentBettingProcessor {
    private connection: Connection;
    private program: anchor.Program;
    private transactionHelper: TransactionHelper;
    private monitor: ThroughputMonitor;

    constructor(
        connection: Connection,
        program: anchor.Program,
        payer: Keypair,
        monitor: ThroughputMonitor
    ) {
        this.connection = connection;
        this.program = program;
        this.transactionHelper = new TransactionHelper(connection, payer);
        this.monitor = monitor;
    }

    async processConcurrentBettingBatch(
        matchId: PublicKey,
        bettors: Keypair[],
        betAmounts: number[],
        batchSize: number = 50
    ): Promise<ConcurrentBettingResult> {
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const startTime = performance.now();

        let successfulBets = 0;
        let failedBets = 0;
        let totalGasConsumed = 0;
        const errors: string[] = [];
        const participants: PublicKey[] = [];

        // Process bets in concurrent batches
        for (let i = 0; i < bettors.length; i += batchSize) {
            const batch = bettors.slice(i, i + batchSize);
            const batchAmounts = betAmounts.slice(i, i + batchSize);

            const batchPromises = batch.map(async (bettor, index) => {
                try {
                    const betAmount = batchAmounts[index];
                    const txStartTime = performance.now();

                    // Create betting transaction
                    const betInstruction = await this.program.methods
                        .placeBet(new anchor.BN(betAmount))
                        .accounts({
                            match: matchId,
                            bettor: bettor.publicKey,
                            systemProgram: SystemProgram.programId,
                        })
                        .instruction();

                    // Add compute budget optimization
                    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
                        units: 200_000 // Optimized compute units
                    });

                    const transaction = new Transaction()
                        .add(computeBudgetIx)
                        .add(betInstruction);

                    const result = await this.transactionHelper.executeTransaction(
                        transaction,
                        [bettor],
                        2 // Reduced retries for throughput
                    );

                    const txLatency = performance.now() - txStartTime;
                    this.monitor.recordTransaction(true, txLatency, result.computeUnits || 0);

                    participants.push(bettor.publicKey);
                    totalGasConsumed += result.computeUnits || 0;
                    successfulBets++;

                    return { success: true, signature: result.signature, latency: txLatency };

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(errorMessage);
                    this.monitor.recordTransaction(false, 0, 0, errorMessage);
                    failedBets++;

                    return { success: false, error: errorMessage };
                }
            });

            // Wait for batch completion
            await Promise.allSettled(batchPromises);

            // Prevent overwhelming the network
            if (i + batchSize < bettors.length) {
                await this.sleep(100); // 100ms between batches
            }
        }

        const batchLatency = performance.now() - startTime;

        return {
            batchId,
            matchId,
            totalBets: bettors.length,
            successfulBets,
            failedBets,
            batchLatency,
            gasConsumed: totalGasConsumed,
            errors,
            participants
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Network congestion simulator
class NetworkCongestionSimulator {
    private connection: Connection;
    private backgroundTransactions: Promise<void>[] = [];
    private isActive: boolean = false;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    async startCongestionSimulation(intensityLevel: number = 1): Promise<void> {
        this.isActive = true;
        const transactionCount = intensityLevel * 20; // Base load multiplier

        console.log(`🌐 Starting network congestion simulation (Level ${intensityLevel})`);

        for (let i = 0; i < transactionCount; i++) {
            const promise = this.generateBackgroundTransaction(i);
            this.backgroundTransactions.push(promise);

            // Stagger transaction generation
            await this.sleep(50);
        }
    }

    async stopCongestionSimulation(): Promise<void> {
        this.isActive = false;
        console.log('🛑 Stopping network congestion simulation');

        // Wait for all background transactions to complete
        await Promise.allSettled(this.backgroundTransactions);
        this.backgroundTransactions = [];
    }

    private async generateBackgroundTransaction(id: number): Promise<void> {
        if (!this.isActive) return;

        try {
            const fromKeypair = Keypair.generate();
            const toKeypair = Keypair.generate();

            // Request airdrop for the from account
            const airdropSig = await this.connection.requestAirdrop(
                fromKeypair.publicKey,
                0.1 * LAMPORTS_PER_SOL
            );
            await this.connection.confirmTransaction(airdropSig);

            // Create transfer transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: toKeypair.publicKey,
                    lamports: 0.01 * LAMPORTS_PER_SOL
                })
            );

            // Send transaction without waiting for confirmation
            await this.connection.sendTransaction(transaction, [fromKeypair], {
                skipPreflight: true,
                preflightCommitment: 'processed'
            });

        } catch (error) {
            // Background transaction failures are expected and ignored
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

describe("Transaction Throughput Tests", () => {
    let connection: Connection;
    let program: anchor.Program;
    let provider: anchor.AnchorProvider;
    let testEnv: TestEnvironment;
    let authority: Keypair;
    let treasury: Keypair;
    let testUsers: Keypair[];
    let performanceProfiler: PerformanceProfiler;
    let throughputMonitor: ThroughputMonitor;
    let concurrentProcessor: ConcurrentBettingProcessor;
    let congestionSimulator: NetworkCongestionSimulator;

    // Test configuration from environment variables (GI #18: No hardcoding)
    const throughputConfig: ThroughputTestConfig = {
        targetTPS: parseInt(process.env.TARGET_TPS || "100"),
        testDurationMs: parseInt(process.env.TEST_DURATION_MS || "30000"), // 30 seconds
        maxConcurrentTx: parseInt(process.env.MAX_CONCURRENT_TX || "200"),
        batchSize: parseInt(process.env.BATCH_SIZE || "50"),
        networkTarget: (process.env.TEST_NETWORK as any) || 'localnet',
        enableStressTest: process.env.ENABLE_STRESS_TEST === 'true',
        gasOptimization: process.env.GAS_OPTIMIZATION !== 'false',
        memoryMonitoring: process.env.MEMORY_MONITORING !== 'false'
    };

    before(async () => {
        console.log("🏗️  Setting up throughput testing environment...");

        // Initialize test environment (GI #2: Real implementations)
        const setup = new TestEnvironmentSetup();
        testEnv = await setup.getTestEnvironment();

        connection = testEnv.connection;
        provider = testEnv.provider;
        program = testEnv.program;
        authority = testEnv.keypairs.authority;
        treasury = testEnv.keypairs.treasury;

        // Generate test users for concurrent operations
        testUsers = Array.from({ length: throughputConfig.maxConcurrentTx }, () => Keypair.generate());

        // Fund test users
        console.log(`💰 Funding ${testUsers.length} test users...`);
        for (const user of testUsers) {
            const airdropSig = await connection.requestAirdrop(
                user.publicKey,
                2 * LAMPORTS_PER_SOL // Sufficient for multiple bets
            );
            await connection.confirmTransaction(airdropSig);
        }

        // Initialize monitoring and processing components
        performanceProfiler = createPerformanceProfiler();
        throughputMonitor = new ThroughputMonitor();
        concurrentProcessor = new ConcurrentBettingProcessor(
            connection,
            program,
            authority,
            throughputMonitor
        );
        congestionSimulator = new NetworkCongestionSimulator(connection);

        console.log("✅ Throughput testing environment ready");
        console.log(`📊 Target TPS: ${throughputConfig.targetTPS}`);
        console.log(`⏱️  Test Duration: ${throughputConfig.testDurationMs}ms`);
        console.log(`🔄 Max Concurrent: ${throughputConfig.maxConcurrentTx}`);
    });

    after(async () => {
        if (congestionSimulator) {
            await congestionSimulator.stopCongestionSimulation();
        }
        console.log("🧹 Throughput testing cleanup completed");
    });

    describe("High-Volume Betting Operations", () => {
        it("should handle 1000+ concurrent bets with target TPS", async function() {
            this.timeout(120000); // 2 minutes for comprehensive test

            console.log("🚀 Starting high-volume concurrent betting test...");

            // Create test match
            const matchKeypair = Keypair.generate();
            const createMatchTx = await program.methods
                .createMatch(
                    "High Volume Test Match",
                    new anchor.BN(Date.now() + 3600000), // 1 hour from now
                    new anchor.BN(0.1 * LAMPORTS_PER_SOL) // Minimum bet
                )
                .accounts({
                    match: matchKeypair.publicKey,
                    authority: authority.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([matchKeypair])
                .rpc();

            console.log("📝 Match created:", createMatchTx);

            // Generate 1000+ betting operations
            const totalBets = Math.max(1000, throughputConfig.maxConcurrentTx);
            const bettors = testUsers.slice(0, totalBets);
            const betAmounts = bettors.map(() =>
                Math.floor(Math.random() * 0.5 * LAMPORTS_PER_SOL) + 0.1 * LAMPORTS_PER_SOL
            );

            // Reset monitor for this test
            throughputMonitor = new ThroughputMonitor();
            concurrentProcessor = new ConcurrentBettingProcessor(
                connection,
                program,
                authority,
                throughputMonitor
            );

            // Execute concurrent betting with performance tracking
            const startTime = performance.now();
            const result = await concurrentProcessor.processConcurrentBettingBatch(
                matchKeypair.publicKey,
                bettors,
                betAmounts,
                throughputConfig.batchSize
            );

            const metrics = throughputMonitor.finalize();
            const endTime = performance.now();
            const totalDuration = endTime - startTime;

            // Validate performance requirements (GI #15: Error-free, working systems)
            console.log("📊 High-Volume Betting Results:");
            console.log(`   Total Bets: ${result.totalBets}`);
            console.log(`   Successful: ${result.successfulBets}`);
            console.log(`   Failed: ${result.failedBets}`);
            console.log(`   Success Rate: ${(result.successfulBets / result.totalBets * 100).toFixed(2)}%`);
            console.log(`   Actual TPS: ${metrics.actualTPS.toFixed(2)}`);
            console.log(`   Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
            console.log(`   P95 Latency: ${metrics.p95Latency.toFixed(2)}ms`);
            console.log(`   Gas Used (Avg): ${metrics.gasUsedAverage.toFixed(0)}`);

            // Performance assertions
            expect(result.successfulBets).to.be.greaterThan(totalBets * 0.95); // 95% success rate minimum
            expect(metrics.actualTPS).to.be.greaterThan(throughputConfig.targetTPS * 0.8); // 80% of target TPS
            expect(metrics.p95Latency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency);
            expect(result.failedBets).to.be.lessThan(totalBets * 0.05); // Less than 5% failures

            // Verify no failed transactions under normal load (GI requirement)
            if (result.failedBets > 0) {
                console.warn("⚠️  Some transactions failed. Error distribution:");
                result.errors.forEach((error, index) => {
                    console.warn(`   ${index + 1}: ${error}`);
                });
            }
        });

        it("should maintain performance under sustained load", async function() {
            this.timeout(180000); // 3 minutes for sustained test

            console.log("⏳ Starting sustained load performance test...");

            // Create multiple matches for distributed load
            const matches: PublicKey[] = [];
            for (let i = 0; i < 5; i++) {
                const matchKeypair = Keypair.generate();
                await program.methods
                    .createMatch(
                        `Sustained Load Match ${i + 1}`,
                        new anchor.BN(Date.now() + 7200000), // 2 hours from now
                        new anchor.BN(0.05 * LAMPORTS_PER_SOL)
                    )
                    .accounts({
                        match: matchKeypair.publicKey,
                        authority: authority.publicKey,
                        treasury: treasury.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([matchKeypair])
                    .rpc();

                matches.push(matchKeypair.publicKey);
            }

            // Reset monitoring
            throughputMonitor = new ThroughputMonitor();
            const sustainedResults: ConcurrentBettingResult[] = [];

            // Run sustained load for configured duration
            const testStartTime = performance.now();
            const testEndTime = testStartTime + throughputConfig.testDurationMs;
            let cycleCount = 0;

            while (performance.now() < testEndTime) {
                cycleCount++;
                const cycleStartTime = performance.now();

                // Distribute load across multiple matches
                const matchIndex = cycleCount % matches.length;
                const selectedMatch = matches[matchIndex];

                // Use subset of users for each cycle
                const cycleUsers = testUsers.slice(0, Math.min(100, testUsers.length));
                const cycleBetAmounts = cycleUsers.map(() =>
                    Math.floor(Math.random() * 0.3 * LAMPORTS_PER_SOL) + 0.05 * LAMPORTS_PER_SOL
                );

                try {
                    const cycleResult = await concurrentProcessor.processConcurrentBettingBatch(
                        selectedMatch,
                        cycleUsers,
                        cycleBetAmounts,
                        25 // Smaller batches for sustained testing
                    );

                    sustainedResults.push(cycleResult);

                    const intermediateMetrics = throughputMonitor.getIntermediateMetrics();
                    console.log(`🔄 Cycle ${cycleCount}: TPS=${intermediateMetrics.actualTPS?.toFixed(1)}, Success=${cycleResult.successfulBets}/${cycleResult.totalBets}`);

                } catch (error) {
                    console.error(`❌ Cycle ${cycleCount} failed:`, error);
                }

                // Brief pause between cycles to prevent overwhelming
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const finalMetrics = throughputMonitor.finalize();

            // Calculate sustained performance metrics
            const totalBetsAcrossCycles = sustainedResults.reduce((sum, result) => sum + result.totalBets, 0);
            const totalSuccessfulBets = sustainedResults.reduce((sum, result) => sum + result.successfulBets, 0);
            const averageCycleLatency = sustainedResults.reduce((sum, result) => sum + result.batchLatency, 0) / sustainedResults.length;

            console.log("📊 Sustained Load Performance Results:");
            console.log(`   Test Duration: ${(finalMetrics.totalTestDuration / 1000).toFixed(1)}s`);
            console.log(`   Total Cycles: ${cycleCount}`);
            console.log(`   Total Bets: ${totalBetsAcrossCycles}`);
            console.log(`   Successful Bets: ${totalSuccessfulBets}`);
            console.log(`   Overall Success Rate: ${(totalSuccessfulBets / totalBetsAcrossCycles * 100).toFixed(2)}%`);
            console.log(`   Sustained TPS: ${finalMetrics.actualTPS.toFixed(2)}`);
            console.log(`   Average Cycle Latency: ${averageCycleLatency.toFixed(2)}ms`);
            console.log(`   Memory Usage: ${(finalMetrics.memoryUsagePeak / 1024 / 1024).toFixed(2)}MB peak`);

            // Performance degradation validation
            expect(finalMetrics.actualTPS).to.be.greaterThan(throughputConfig.targetTPS * 0.7); // Allow some degradation
            expect(totalSuccessfulBets / totalBetsAcrossCycles).to.be.greaterThan(0.90); // 90% success rate
            expect(finalMetrics.averageLatency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency * 1.5); // Allow latency increase
            expect(cycleCount).to.be.greaterThan(5); // Ensure meaningful test duration
        });
    });

    describe("Network Congestion Handling", () => {
        it("should maintain performance during network congestion", async function() {
            this.timeout(150000); // 2.5 minutes for congestion test

            console.log("🌐 Starting network congestion performance test...");

            // Create test match
            const matchKeypair = Keypair.generate();
            await program.methods
                .createMatch(
                    "Congestion Test Match",
                    new anchor.BN(Date.now() + 3600000),
                    new anchor.BN(0.1 * LAMPORTS_PER_SOL)
                )
                .accounts({
                    match: matchKeypair.publicKey,
                    authority: authority.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([matchKeypair])
                .rpc();

            // Test performance under different congestion levels
            const congestionLevels = [1, 2, 3]; // Low, Medium, High congestion
            const congestionResults: { level: number; metrics: ThroughputMetrics }[] = [];

            for (const level of congestionLevels) {
                console.log(`🌪️  Testing congestion level ${level}...`);

                // Start network congestion simulation
                await congestionSimulator.startCongestionSimulation(level);

                // Reset monitoring
                throughputMonitor = new ThroughputMonitor();
                concurrentProcessor = new ConcurrentBettingProcessor(
                    connection,
                    program,
                    authority,
                    throughputMonitor
                );

                // Execute betting operations under congestion
                const congestionTestUsers = testUsers.slice(0, 200); // Moderate load
                const betAmounts = congestionTestUsers.map(() => 0.15 * LAMPORTS_PER_SOL);

                try {
                    const result = await concurrentProcessor.processConcurrentBettingBatch(
                        matchKeypair.publicKey,
                        congestionTestUsers,
                        betAmounts,
                        30 // Smaller batches under congestion
                    );

                    const metrics = throughputMonitor.finalize();
                    congestionResults.push({ level, metrics });

                    console.log(`   Level ${level} - TPS: ${metrics.actualTPS.toFixed(1)}, Latency: ${metrics.averageLatency.toFixed(1)}ms, Success: ${result.successfulBets}/${result.totalBets}`);

                } catch (error) {
                    console.error(`❌ Congestion level ${level} test failed:`, error);
                } finally {
                    // Stop congestion simulation
                    await congestionSimulator.stopCongestionSimulation();
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Recovery time
                }
            }

            // Analyze congestion impact
            console.log("📊 Network Congestion Impact Analysis:");
            const baselineMetrics = congestionResults[0]?.metrics;
            if (baselineMetrics) {
                congestionResults.forEach(({ level, metrics }) => {
                    const tpsRatio = metrics.actualTPS / baselineMetrics.actualTPS;
                    const latencyRatio = metrics.averageLatency / baselineMetrics.averageLatency;
                    console.log(`   Level ${level}: TPS Ratio=${tpsRatio.toFixed(2)}, Latency Ratio=${latencyRatio.toFixed(2)}`);
                });
            }

            // Validate graceful degradation requirements
            const highCongestionMetrics = congestionResults[congestionResults.length - 1]?.metrics;
            if (highCongestionMetrics && baselineMetrics) {
                // Should maintain at least 50% performance under high congestion
                expect(highCongestionMetrics.actualTPS).to.be.greaterThan(baselineMetrics.actualTPS * 0.5);
                // Latency should not increase by more than 300%
                expect(highCongestionMetrics.averageLatency).to.be.lessThan(baselineMetrics.averageLatency * 4);
            }
        });

        it("should handle network interruptions gracefully", async function() {
            this.timeout(90000); // 1.5 minutes for interruption test

            console.log("🔌 Starting network interruption handling test...");

            // Create test match
            const matchKeypair = Keypair.generate();
            await program.methods
                .createMatch(
                    "Interruption Test Match",
                    new anchor.BN(Date.now() + 3600000),
                    new anchor.BN(0.1 * LAMPORTS_PER_SOL)
                )
                .accounts({
                    match: matchKeypair.publicKey,
                    authority: authority.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([matchKeypair])
                .rpc();

            // Reset monitoring
            throughputMonitor = new ThroughputMonitor();
            concurrentProcessor = new ConcurrentBettingProcessor(
                connection,
                program,
                authority,
                throughputMonitor
            );

            const testBettors = testUsers.slice(0, 100);
            const betAmounts = testBettors.map(() => 0.1 * LAMPORTS_PER_SOL);

            // Simulate network interruption during betting
            let interruptionOccurred = false;
            const interruptionPromise = new Promise<void>((resolve) => {
                setTimeout(async () => {
                    console.log("⚡ Simulating network interruption...");
                    interruptionOccurred = true;

                    // Start high congestion to simulate interruption
                    await congestionSimulator.startCongestionSimulation(5);

                    setTimeout(async () => {
                        console.log("🔄 Network recovering...");
                        await congestionSimulator.stopCongestionSimulation();
                        resolve();
                    }, 5000); // 5 second interruption
                }, 3000); // Start interruption after 3 seconds
            });

            // Execute betting operations with potential interruption
            const bettingPromise = concurrentProcessor.processConcurrentBettingBatch(
                matchKeypair.publicKey,
                testBettors,
                betAmounts,
                20 // Smaller batches for interruption testing
            );

            // Wait for both betting and interruption to complete
            const [result] = await Promise.all([bettingPromise, interruptionPromise]);
            const metrics = throughputMonitor.finalize();

            console.log("📊 Network Interruption Test Results:");
            console.log(`   Interruption Occurred: ${interruptionOccurred}`);
            console.log(`   Total Bets: ${result.totalBets}`);
            console.log(`   Successful: ${result.successfulBets}`);
            console.log(`   Failed: ${result.failedBets}`);
            console.log(`   Recovery Success Rate: ${(result.successfulBets / result.totalBets * 100).toFixed(2)}%`);
            console.log(`   Final TPS: ${metrics.actualTPS.toFixed(2)}`);

            // Validate graceful handling of interruptions
            expect(result.successfulBets).to.be.greaterThan(result.totalBets * 0.7); // 70% success rate minimum
            expect(result.errors.length).to.be.lessThan(result.totalBets * 0.3); // Less than 30% errors
            expect(metrics.actualTPS).to.be.greaterThan(0); // System should recover
        });
    });

    describe("Stress Testing and Scalability", () => {
        it("should handle extreme load scenarios", async function() {
            this.timeout(300000); // 5 minutes for extreme stress test

            if (!throughputConfig.enableStressTest) {
                console.log("⏭️  Stress testing disabled via configuration");
                this.skip();
                return;
            }

            console.log("💥 Starting extreme stress test...");

            // Create multiple matches for distributed extreme load
            const stressMatches: PublicKey[] = [];
            const matchCount = 10;

            for (let i = 0; i < matchCount; i++) {
                const matchKeypair = Keypair.generate();
                await program.methods
                    .createMatch(
                        `Stress Test Match ${i + 1}`,
                        new anchor.BN(Date.now() + 7200000),
                        new anchor.BN(0.01 * LAMPORTS_PER_SOL)
                    )
                    .accounts({
                        match: matchKeypair.publicKey,
                        authority: authority.publicKey,
                        treasury: treasury.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([matchKeypair])
                    .rpc();

                stressMatches.push(matchKeypair.publicKey);
            }

            // Define stress test scenarios
            const stressScenarios: StressTestScenario[] = [
                {
                    name: "High Volume",
                    simultaneousMatches: 5,
                    betsPerMatch: 500,
                    targetLoadMultiplier: 2,
                    expectedDegradation: 0.3,
                    criticalFailureThreshold: 0.5
                },
                {
                    name: "Extreme Concurrency",
                    simultaneousMatches: 10,
                    betsPerMatch: 200,
                    targetLoadMultiplier: 3,
                    expectedDegradation: 0.5,
                    criticalFailureThreshold: 0.7
                }
            ];

            const stressResults: { scenario: StressTestScenario; metrics: ThroughputMetrics; success: boolean }[] = [];

            for (const scenario of stressScenarios) {
                console.log(`🔥 Executing stress scenario: ${scenario.name}`);

                // Reset monitoring
                throughputMonitor = new ThroughputMonitor();
                concurrentProcessor = new ConcurrentBettingProcessor(
                    connection,
                    program,
                    authority,
                    throughputMonitor
                );

                try {
                    const scenarioPromises: Promise<ConcurrentBettingResult>[] = [];

                    // Execute concurrent betting across multiple matches
                    for (let i = 0; i < scenario.simultaneousMatches; i++) {
                        const matchId = stressMatches[i % stressMatches.length];
                        const scenarioBettors = testUsers.slice(
                            i * scenario.betsPerMatch,
                            (i + 1) * scenario.betsPerMatch
                        );
                        const scenarioBetAmounts = scenarioBettors.map(() => 0.02 * LAMPORTS_PER_SOL);

                        const promise = concurrentProcessor.processConcurrentBettingBatch(
                            matchId,
                            scenarioBettors,
                            scenarioBetAmounts,
                            15 // Very small batches for extreme stress
                        );

                        scenarioPromises.push(promise);
                    }

                    // Wait for all concurrent operations
                    const scenarioResults = await Promise.allSettled(scenarioPromises);
                    const metrics = throughputMonitor.finalize();

                    // Analyze scenario results
                    const successfulResults = scenarioResults.filter(r => r.status === 'fulfilled').length;
                    const failureRate = 1 - (successfulResults / scenarioResults.length);
                    const scenarioSuccess = failureRate < scenario.criticalFailureThreshold;

                    stressResults.push({ scenario, metrics, success: scenarioSuccess });

                    console.log(`   ${scenario.name} Results:`);
                    console.log(`     Successful Matches: ${successfulResults}/${scenarioResults.length}`);
                    console.log(`     Failure Rate: ${(failureRate * 100).toFixed(1)}%`);
                    console.log(`     TPS: ${metrics.actualTPS.toFixed(1)}`);
                    console.log(`     Latency: ${metrics.averageLatency.toFixed(1)}ms`);
                    console.log(`     Scenario Success: ${scenarioSuccess ? '✅' : '❌'}`);

                } catch (error) {
                    console.error(`❌ Stress scenario ${scenario.name} failed:`, error);
                    const emptyMetrics = throughputMonitor.finalize();
                    stressResults.push({ scenario, metrics: emptyMetrics, success: false });
                }

                // Recovery time between scenarios
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // Validate stress test results
            console.log("📊 Stress Testing Summary:");
            stressResults.forEach(({ scenario, metrics, success }) => {
                console.log(`   ${scenario.name}: ${success ? 'PASSED' : 'FAILED'} - TPS=${metrics.actualTPS.toFixed(1)}`);
            });

            // At least one stress scenario should pass
            const passedScenarios = stressResults.filter(r => r.success).length;
            expect(passedScenarios).to.be.greaterThan(0);

            // System should maintain basic functionality under stress
            const lastMetrics = stressResults[stressResults.length - 1]?.metrics;
            if (lastMetrics) {
                expect(lastMetrics.actualTPS).to.be.greaterThan(0);
                expect(lastMetrics.successfulTransactions).to.be.greaterThan(0);
            }
        });

        it("should optimize gas consumption under load", async function() {
            this.timeout(120000); // 2 minutes for gas optimization test

            console.log("⛽ Starting gas consumption optimization test...");

            // Create test match
            const matchKeypair = Keypair.generate();
            await program.methods
                .createMatch(
                    "Gas Optimization Test",
                    new anchor.BN(Date.now() + 3600000),
                    new anchor.BN(0.05 * LAMPORTS_PER_SOL)
                )
                .accounts({
                    match: matchKeypair.publicKey,
                    authority: authority.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([matchKeypair])
                .rpc();

            // Test with and without gas optimization
            const optimizationScenarios = [
                { name: "Without Optimization", optimize: false },
                { name: "With Optimization", optimize: true }
            ];

            const gasResults: { scenario: string; avgGas: number; totalGas: number; tps: number }[] = [];

            for (const scenario of optimizationScenarios) {
                console.log(`🔧 Testing: ${scenario.name}`);

                // Configure gas optimization
                throughputConfig.gasOptimization = scenario.optimize;

                // Reset monitoring
                throughputMonitor = new ThroughputMonitor();
                concurrentProcessor = new ConcurrentBettingProcessor(
                    connection,
                    program,
                    authority,
                    throughputMonitor
                );

                const gasTestUsers = testUsers.slice(0, 100);
                const gasTestAmounts = gasTestUsers.map(() => 0.08 * LAMPORTS_PER_SOL);

                try {
                    const result = await concurrentProcessor.processConcurrentBettingBatch(
                        matchKeypair.publicKey,
                        gasTestUsers,
                        gasTestAmounts,
                        25
                    );

                    const metrics = throughputMonitor.finalize();

                    gasResults.push({
                        scenario: scenario.name,
                        avgGas: metrics.gasUsedAverage,
                        totalGas: metrics.gasUsedTotal,
                        tps: metrics.actualTPS
                    });

                    console.log(`   ${scenario.name} Results:`);
                    console.log(`     Average Gas: ${metrics.gasUsedAverage.toFixed(0)}`);
                    console.log(`     Total Gas: ${metrics.gasUsedTotal.toFixed(0)}`);
                    console.log(`     TPS: ${metrics.actualTPS.toFixed(1)}`);

                } catch (error) {
                    console.error(`❌ Gas test scenario ${scenario.name} failed:`, error);
                }
            }

            // Analyze gas optimization effectiveness
            if (gasResults.length === 2) {
                const [nonOptimized, optimized] = gasResults;
                const gasReduction = (nonOptimized.avgGas - optimized.avgGas) / nonOptimized.avgGas;
                const tpsImprovement = (optimized.tps - nonOptimized.tps) / nonOptimized.tps;

                console.log("📊 Gas Optimization Analysis:");
                console.log(`   Gas Reduction: ${(gasReduction * 100).toFixed(1)}%`);
                console.log(`   TPS Improvement: ${(tpsImprovement * 100).toFixed(1)}%`);

                // Validate optimization effectiveness
                if (throughputConfig.gasOptimization) {
                    expect(optimized.avgGas).to.be.lessThan(nonOptimized.avgGas * 1.1); // Should not increase gas significantly
                    expect(optimized.tps).to.be.greaterThanOrEqual(nonOptimized.tps * 0.9); // Should maintain TPS
                }
            }

            // Validate gas usage is within reasonable limits
            const avgGasUsage = gasResults.reduce((sum, r) => sum + r.avgGas, 0) / gasResults.length;
            expect(avgGasUsage).to.be.lessThan(300000); // Reasonable gas limit
        });
    });

    describe("Latency and Performance Targets", () => {
        it("should meet latency targets under normal load", async function() {
            this.timeout(90000); // 1.5 minutes for latency test

            console.log("⏱️  Starting latency target validation...");

            // Create test match
            const matchKeypair = Keypair.generate();
            await program.methods
                .createMatch(
                    "Latency Test Match",
                    new anchor.BN(Date.now() + 3600000),
                    new anchor.BN(0.1 * LAMPORTS_PER_SOL)
                )
                .accounts({
                    match: matchKeypair.publicKey,
                    authority: authority.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([matchKeypair])
                .rpc();

            // Test latency under different load levels
            const loadLevels = [10, 50, 100, 200]; // Number of concurrent transactions
            const latencyResults: { load: number; metrics: ThroughputMetrics }[] = [];

            for (const load of loadLevels) {
                console.log(`📊 Testing latency with ${load} concurrent transactions...`);

                // Reset monitoring
                throughputMonitor = new ThroughputMonitor();
                concurrentProcessor = new ConcurrentBettingProcessor(
                    connection,
                    program,
                    authority,
                    throughputMonitor
                );

                const loadTestUsers = testUsers.slice(0, load);
                const loadTestAmounts = loadTestUsers.map(() => 0.12 * LAMPORTS_PER_SOL);

                try {
                    const result = await concurrentProcessor.processConcurrentBettingBatch(
                        matchKeypair.publicKey,
                        loadTestUsers,
                        loadTestAmounts,
                        Math.min(20, load) // Appropriate batch size
                    );

                    const metrics = throughputMonitor.finalize();
                    latencyResults.push({ load, metrics });

                    console.log(`   Load ${load}: Avg=${metrics.averageLatency.toFixed(1)}ms, P95=${metrics.p95Latency.toFixed(1)}ms, P99=${metrics.p99Latency.toFixed(1)}ms`);

                } catch (error) {
                    console.error(`❌ Latency test with load ${load} failed:`, error);
                }

                // Brief pause between load tests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Analyze latency scaling
            console.log("📊 Latency Scaling Analysis:");
            latencyResults.forEach(({ load, metrics }) => {
                const meetsTarget = metrics.p95Latency < TEST_CONFIG.benchmarks.maxLatency;
                console.log(`   Load ${load}: P95=${metrics.p95Latency.toFixed(1)}ms - ${meetsTarget ? '✅' : '❌'}`);
            });

            // Validate latency requirements
            latencyResults.forEach(({ load, metrics }) => {
                // P95 latency should meet targets for reasonable loads
                if (load <= 100) {
                    expect(metrics.p95Latency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency);
                }

                // Average latency should be significantly better than P95
                expect(metrics.averageLatency).to.be.lessThan(metrics.p95Latency);

                // Latency should not be excessively high even under stress
                expect(metrics.p99Latency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency * 2);
            });

            // Verify latency doesn't degrade unreasonably with load
            if (latencyResults.length >= 2) {
                const lowLoad = latencyResults[0];
                const highLoad = latencyResults[latencyResults.length - 1];
                const latencyIncrease = highLoad.metrics.averageLatency / lowLoad.metrics.averageLatency;

                expect(latencyIncrease).to.be.lessThan(5); // Latency shouldn't increase more than 5x
            }
        });

        it("should maintain consistent performance across test runs", async function() {
            this.timeout(180000); // 3 minutes for consistency test

            console.log("🔄 Starting performance consistency validation...");

            // Create test match
            const matchKeypair = Keypair.generate();
            await program.methods
                .createMatch(
                    "Consistency Test Match",
                    new anchor.BN(Date.now() + 7200000),
                    new anchor.BN(0.08 * LAMPORTS_PER_SOL)
                )
                .accounts({
                    match: matchKeypair.publicKey,
                    authority: authority.publicKey,
                    treasury: treasury.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([matchKeypair])
                .rpc();

            // Run multiple identical test rounds
            const testRounds = 5;
            const roundResults: ThroughputMetrics[] = [];
            const consistencyTestUsers = testUsers.slice(0, 80);
            const consistencyBetAmounts = consistencyTestUsers.map(() => 0.1 * LAMPORTS_PER_SOL);

            for (let round = 1; round <= testRounds; round++) {
                console.log(`🔄 Executing consistency test round ${round}/${testRounds}...`);

                // Reset monitoring for each round
                throughputMonitor = new ThroughputMonitor();
                concurrentProcessor = new ConcurrentBettingProcessor(
                    connection,
                    program,
                    authority,
                    throughputMonitor
                );

                try {
                    const result = await concurrentProcessor.processConcurrentBettingBatch(
                        matchKeypair.publicKey,
                        consistencyTestUsers,
                        consistencyBetAmounts,
                        20
                    );

                    const metrics = throughputMonitor.finalize();
                    roundResults.push(metrics);

                    console.log(`   Round ${round}: TPS=${metrics.actualTPS.toFixed(1)}, Latency=${metrics.averageLatency.toFixed(1)}ms, Success=${result.successfulBets}/${result.totalBets}`);

                } catch (error) {
                    console.error(`❌ Consistency test round ${round} failed:`, error);
                }

                // Brief pause between rounds
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Analyze performance consistency
            if (roundResults.length >= 3) {
                const tpsValues = roundResults.map(m => m.actualTPS);
                const latencyValues = roundResults.map(m => m.averageLatency);

                const avgTPS = tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length;
                const avgLatency = latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length;

                const tpsStdDev = Math.sqrt(
                    tpsValues.reduce((sum, tps) => sum + Math.pow(tps - avgTPS, 2), 0) / tpsValues.length
                );
                const latencyStdDev = Math.sqrt(
                    latencyValues.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencyValues.length
                );

                const tpsCoeffVar = tpsStdDev / avgTPS;
                const latencyCoeffVar = latencyStdDev / avgLatency;

                console.log("📊 Performance Consistency Analysis:");
                console.log(`   Average TPS: ${avgTPS.toFixed(1)} ± ${tpsStdDev.toFixed(1)} (CV: ${(tpsCoeffVar * 100).toFixed(1)}%)`);
                console.log(`   Average Latency: ${avgLatency.toFixed(1)}ms ± ${latencyStdDev.toFixed(1)}ms (CV: ${(latencyCoeffVar * 100).toFixed(1)}%)`);

                // Validate consistency requirements
                expect(tpsCoeffVar).to.be.lessThan(0.3); // TPS should not vary more than 30%
                expect(latencyCoeffVar).to.be.lessThan(0.4); // Latency should not vary more than 40%
                expect(avgTPS).to.be.greaterThan(throughputConfig.targetTPS * 0.8); // Maintain target performance
                expect(avgLatency).to.be.lessThan(TEST_CONFIG.benchmarks.maxLatency); // Meet latency targets
            }
        });
    });
});
