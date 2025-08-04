/**
 * Smart Contract Testing Utilities and Helpers

 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import { assert } from "chai";

/**
 * Transaction Builder Utilities
 * GI #4: Modular and professional design
 */
export class TransactionHelper {
    private connection: Connection;
    private payer: Keypair;

    constructor(connection: Connection, payer: Keypair) {
        this.connection = connection;
        this.payer = payer;
    }

    /**
     * Execute transaction with retry logic and performance tracking
     * GI #20: Robust error handling, GI #21: Performance optimization
     */
    async executeTransaction(
        transaction: Transaction,
        signers: Keypair[] = [],
        retries: number = 3
    ): Promise<{ signature: string; latency: number; computeUnits?: number }> {
        const startTime = performance.now();
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Add recent blockhash
                const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
                transaction.recentBlockhash = blockhash;
                transaction.lastValidBlockHeight = lastValidBlockHeight;

                // Sign transaction
                transaction.sign(this.payer, ...signers);

                // Send and confirm
                const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: "confirmed",
                });

                // Wait for confirmation
                const confirmation = await this.connection.confirmTransaction({
                    signature,
                    blockhash,
                    lastValidBlockHeight,
                }, "confirmed");

                if (confirmation.value.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }

                const latency = performance.now() - startTime;

                // Get compute units used (if available)
                let computeUnits: number | undefined;
                try {
                    const txDetails = await this.connection.getTransaction(signature, {
                        commitment: "confirmed",
                        maxSupportedTransactionVersion: 0
                    });
                    computeUnits = txDetails?.meta?.computeUnitsConsumed || undefined;
                } catch (error) {
                    // Compute units not critical for test success
                }

                return { signature, latency, computeUnits };

            } catch (error) {
                lastError = error as Error;
                console.warn(`Transaction attempt ${attempt}/${retries} failed:`, error);

                if (attempt < retries) {
                    // Wait with exponential backoff
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
            }
        }

        throw new Error(`Transaction failed after ${retries} attempts: ${lastError?.message}`);
    }

    /**
     * Create and fund test account
     * GI #2: Real implementations
     */
    async createAndFundAccount(lamports: number = LAMPORTS_PER_SOL): Promise<Keypair> {
        const newAccount = Keypair.generate();

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: this.payer.publicKey,
                newAccountPubkey: newAccount.publicKey,
                lamports,
                space: 0,
                programId: SystemProgram.programId,
            })
        );

        await this.executeTransaction(transaction, [newAccount]);
        return newAccount;
    }

    /**
     * Create transfer transaction for testing purposes
     * GI #2: Real implementations
     */
    async createTransferTransaction(
        destination: PublicKey,
        lamports: number
    ): Promise<Transaction> {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.payer.publicKey,
                toPubkey: destination,
                lamports,
            })
        );

        // Add recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.payer.publicKey;

        return transaction;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Account Validation Utilities
 * GI #15: Thoroughly verify functionality
 */
export class AccountValidator {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Validate account state with comprehensive checks
     */
    async validateAccountState(
        publicKey: PublicKey,
        expectedOwner?: PublicKey,
        expectedDataLength?: number,
        expectedLamports?: number
    ): Promise<void> {
        const accountInfo = await this.connection.getAccountInfo(publicKey);

        assert(accountInfo !== null, `Account ${publicKey.toBase58()} does not exist`);

        if (expectedOwner) {
            assert(
                accountInfo.owner.equals(expectedOwner),
                `Account owner mismatch. Expected: ${expectedOwner.toBase58()}, Got: ${accountInfo.owner.toBase58()}`
            );
        }

        if (expectedDataLength !== undefined) {
            assert(
                accountInfo.data.length === expectedDataLength,
                `Account data length mismatch. Expected: ${expectedDataLength}, Got: ${accountInfo.data.length}`
            );
        }

        if (expectedLamports !== undefined) {
            assert(
                accountInfo.lamports >= expectedLamports,
                `Insufficient lamports. Expected: ${expectedLamports}, Got: ${accountInfo.lamports}`
            );
        }
    }

    /**
     * Validate program account with data deserialization
     */
    async validateProgramAccount<T>(
        program: anchor.Program,
        accountType: string,
        publicKey: PublicKey,
        expectedData?: Partial<T>
    ): Promise<T> {
        try {
            const accountData = await (program.account as any)[accountType].fetch(publicKey);

            if (expectedData) {
                for (const [key, expectedValue] of Object.entries(expectedData)) {
                    const actualValue = (accountData as any)[key];

                    if (BN.isBN(expectedValue) && BN.isBN(actualValue)) {
                        assert(
                            (expectedValue as BN).eq(actualValue as BN),
                            `${key} mismatch. Expected: ${(expectedValue as BN).toString()}, Got: ${(actualValue as BN).toString()}`
                        );
                    } else if (expectedValue instanceof PublicKey && actualValue instanceof PublicKey) {
                        assert(
                            (expectedValue as PublicKey).equals(actualValue as PublicKey),
                            `${key} mismatch. Expected: ${(expectedValue as PublicKey).toBase58()}, Got: ${(actualValue as PublicKey).toBase58()}`
                        );
                    } else {
                        assert(
                            JSON.stringify(expectedValue) === JSON.stringify(actualValue),
                            `${key} mismatch. Expected: ${JSON.stringify(expectedValue)}, Got: ${JSON.stringify(actualValue)}`
                        );
                    }
                }
            }

            return accountData as T;
        } catch (error) {
            throw new Error(`Failed to validate program account ${accountType} at ${publicKey.toBase58()}: ${error}`);
        }
    }
}

/**
 * Performance Testing Utilities
 * GI #21: Performance optimization, GI #25: Scalability
 */
export class PerformanceProfiler {
    private metrics: Map<string, Array<{ timestamp: number; value: number; metadata?: any }>>;

    constructor() {
        this.metrics = new Map();
    }

    /**
     * Start performance measurement
     */
    startMeasurement(key: string): () => void {
        const startTime = performance.now();

        return (metadata?: any) => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            this.recordMetric(key, duration, { timestamp: Date.now(), ...metadata });
        };
    }

    /**
     * Record metric value
     */
    recordMetric(key: string, value: number, metadata?: any): void {
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }

        this.metrics.get(key)!.push({
            timestamp: Date.now(),
            value,
            metadata
        });
    }

    /**
     * Get performance statistics
     */
    getStats(key: string): {
        count: number;
        min: number;
        max: number;
        avg: number;
        median: number;
        p95: number;
        p99: number;
    } | null {
        const data = this.metrics.get(key);
        if (!data || data.length === 0) return null;

        const values = data.map(d => d.value).sort((a, b) => a - b);
        const count = values.length;

        return {
            count,
            min: values[0],
            max: values[count - 1],
            avg: values.reduce((sum, val) => sum + val, 0) / count,
            median: values[Math.floor(count / 2)],
            p95: values[Math.floor(count * 0.95)],
            p99: values[Math.floor(count * 0.99)]
        };
    }

    /**
     * Generate performance report
     */
    generateReport(): string {
        let report = "📊 Performance Test Results\n";
        report += "=".repeat(50) + "\n\n";

        for (const [key, data] of this.metrics.entries()) {
            const stats = this.getStats(key);
            if (stats) {
                report += `🔍 ${key}\n`;
                report += `   Count: ${stats.count}\n`;
                report += `   Min: ${stats.min.toFixed(2)}ms\n`;
                report += `   Max: ${stats.max.toFixed(2)}ms\n`;
                report += `   Avg: ${stats.avg.toFixed(2)}ms\n`;
                report += `   Median: ${stats.median.toFixed(2)}ms\n`;
                report += `   P95: ${stats.p95.toFixed(2)}ms\n`;
                report += `   P99: ${stats.p99.toFixed(2)}ms\n\n`;
            }
        }

        return report;
    }

    /**
     * Get comprehensive metrics
     */
    getMetrics(): {
        averageLatency: number;
        maxLatency: number;
        computeEfficiency: number;
        resourceUtilization: number;
    } {
        const allMetrics = Array.from(this.metrics.values()).flat();
        if (allMetrics.length === 0) {
            return {
                averageLatency: 0,
                maxLatency: 0,
                computeEfficiency: 100,
                resourceUtilization: 0
            };
        }

        const latencies = allMetrics.map(m => m.value);
        const averageLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);

        return {
            averageLatency,
            maxLatency,
            computeEfficiency: Math.max(0, 100 - (averageLatency / 1000) * 10), // Simple efficiency metric
            resourceUtilization: Math.min(100, (latencies.length / 1000) * 100) // Usage based on test count
        };
    }

    /**
     * Validate performance benchmarks
     */
    validateBenchmarks(benchmarks: Record<string, { maxLatency?: number; minThroughput?: number }>): boolean {
        let allPassed = true;

        for (const [key, benchmark] of Object.entries(benchmarks)) {
            const stats = this.getStats(key);
            if (!stats) continue;

            if (benchmark.maxLatency && stats.p95 > benchmark.maxLatency) {
                console.error(`❌ ${key} P95 latency (${stats.p95.toFixed(2)}ms) exceeds benchmark (${benchmark.maxLatency}ms)`);
                allPassed = false;
            }

            if (benchmark.minThroughput) {
                const throughput = 1000 / stats.avg; // ops per second
                if (throughput < benchmark.minThroughput) {
                    console.error(`❌ ${key} throughput (${throughput.toFixed(2)} ops/s) below benchmark (${benchmark.minThroughput} ops/s)`);
                    allPassed = false;
                }
            }
        }

        return allPassed;
    }
}

/**
 * Security Testing Utilities
 * GI #13: Security measures, GI #27: Data privacy
 */
export class SecurityTester {
    private connection: Connection;
    private securityEvents: Array<{
        eventType: string;
        testCase?: string;
        testName?: string;
        severity?: string;
        result: string;
        executionTime?: number;
        timestamp: string;
        error?: string;
        errorDetails?: string;
        expectedBehavior?: string;
        accountType?: string;
        maliciousAction?: string;
        attemptType?: string;
        pattern?: string;
        attempts?: number;
        failures?: number;
        matchId?: string;
        targetAccount?: string;
    }>;

    constructor(connection: Connection) {
        this.connection = connection;
        this.securityEvents = [];
    }

    /**
     * Log security events for comprehensive tracking
     */
    logSecurityEvent(event: {
        eventType: string;
        testCase?: string;
        testName?: string;
        severity?: string;
        result: string;
        executionTime?: number;
        timestamp?: string;
        error?: string;
        errorDetails?: string;
        expectedBehavior?: string;
        accountType?: string;
        maliciousAction?: string;
        attemptType?: string;
        pattern?: string;
        attempts?: number;
        failures?: number;
        matchId?: string;
        targetAccount?: string;
    }): void {
        this.securityEvents.push({
            ...event,
            timestamp: event.timestamp || new Date().toISOString()
        });
    }

    /**
     * Get all recorded security events
     */
    getSecurityEvents(): Array<any> {
        return [...this.securityEvents];
    }

    /**
     * Clear security event log
     */
    clearSecurityEvents(): void {
        this.securityEvents = [];
    }

    /**
     * Test unauthorized access scenarios
     */
    async testUnauthorizedAccess(
        program: anchor.Program,
        instruction: string,
        authorizedSigner: Keypair,
        unauthorizedSigner: Keypair,
        accounts: any,
        args: any[]
    ): Promise<boolean> {
        try {
            // First, verify authorized access works
            const authorizedTx = await program.methods[instruction](...args)
                .accounts(accounts)
                .signers([authorizedSigner])
                .rpc();

            console.log(`✅ Authorized access succeeded: ${authorizedTx}`);

            // Then test unauthorized access fails
            try {
                await program.methods[instruction](...args)
                    .accounts({
                        ...accounts,
                        signer: unauthorizedSigner.publicKey
                    })
                    .signers([unauthorizedSigner])
                    .rpc();

                console.error(`❌ Unauthorized access succeeded - SECURITY ISSUE`);
                return false;

            } catch (error) {
                console.log(`✅ Unauthorized access properly rejected: ${error}`);
                return true;
            }

        } catch (error) {
            console.error(`❌ Authorized access failed: ${error}`);
            return false;
        }
    }

    /**
     * Test input validation and bounds checking
     */
    async testInputValidation(
        program: anchor.Program,
        instruction: string,
        signer: Keypair,
        accounts: any,
        validArgs: any[],
        invalidTestCases: Array<{ args: any[]; expectedError: string }>
    ): Promise<boolean> {
        let allTestsPassed = true;

        // Test valid input succeeds
        try {
            await program.methods[instruction](...validArgs)
                .accounts(accounts)
                .signers([signer])
                .rpc();
            console.log(`✅ Valid input accepted`);
        } catch (error) {
            console.error(`❌ Valid input rejected: ${error}`);
            allTestsPassed = false;
        }

        // Test invalid inputs are rejected
        for (const testCase of invalidTestCases) {
            try {
                await program.methods[instruction](...testCase.args)
                    .accounts(accounts)
                    .signers([signer])
                    .rpc();

                console.error(`❌ Invalid input accepted - SECURITY ISSUE: ${JSON.stringify(testCase.args)}`);
                allTestsPassed = false;

            } catch (error) {
                if ((error as Error).toString().includes(testCase.expectedError)) {
                    console.log(`✅ Invalid input properly rejected: ${testCase.expectedError}`);
                } else {
                    console.warn(`⚠️ Invalid input rejected with unexpected error: ${error}`);
                }
            }
        }

        return allTestsPassed;
    }

    /**
     * Test for potential integer overflow/underflow
     */
    async testNumericBounds(
        program: anchor.Program,
        instruction: string,
        signer: Keypair,
        accounts: any,
        numericArgIndex: number
    ): Promise<boolean> {
        const testCases = [
            { value: new BN(0), description: "Zero value" },
            { value: new BN(2).pow(new BN(63)).sub(new BN(1)), description: "Max i64" },
            { value: new BN(2).pow(new BN(64)).sub(new BN(1)), description: "Max u64" },
        ];

        let allTestsPassed = true;

        for (const testCase of testCases) {
            try {
                const args = Array(numericArgIndex + 1).fill(null);
                args[numericArgIndex] = testCase.value;

                await program.methods[instruction](...args)
                    .accounts(accounts)
                    .signers([signer])
                    .rpc();

                console.log(`✅ ${testCase.description} handled correctly`);

            } catch (error) {
                // Check if it's a proper validation error vs unexpected crash
                if ((error as Error).toString().includes("overflow") || (error as Error).toString().includes("Invalid")) {
                    console.log(`✅ ${testCase.description} properly validated: ${error}`);
                } else {
                    console.error(`❌ ${testCase.description} caused unexpected error: ${error}`);
                    allTestsPassed = false;
                }
            }
        }

        return allTestsPassed;
    }
}

/**
 * Test Data Utilities
 * GI #17: Generalize for reusability, GI #45: Handle edge cases
 */
export class TestDataGenerator {
    /**
     * Generate random valid Solana address
     */
    static generateRandomPubkey(): PublicKey {
        return Keypair.generate().publicKey;
    }

    /**
     * Generate random amount within bounds
     */
    static generateRandomAmount(min: number = 0.01, max: number = 10): BN {
        const randomFloat = Math.random() * (max - min) + min;
        return new BN(Math.floor(randomFloat * LAMPORTS_PER_SOL));
    }

    /**
     * Generate test user data
     */
    static generateUserData(kycLevel: number = 1): {
        kyc_level: number;
        compliance_flags: number;
        reputation_score: BN;
        total_volume: BN;
    } {
        return {
            kyc_level: kycLevel,
            compliance_flags: Math.floor(Math.random() * 256), // Random flags
            reputation_score: new BN(Math.floor(Math.random() * 1000)),
            total_volume: this.generateRandomAmount(0, 100)
        };
    }

    /**
     * Generate test match data
     */
    static generateMatchData(): {
        agent1_id: PublicKey;
        agent2_id: PublicKey;
        entry_fee: BN;
        max_participants: number;
        duration: BN;
    } {
        return {
            agent1_id: this.generateRandomPubkey(),
            agent2_id: this.generateRandomPubkey(),
            entry_fee: this.generateRandomAmount(0.1, 1),
            max_participants: Math.floor(Math.random() * 100) + 10,
            duration: new BN(Math.floor(Math.random() * 3600) + 300) // 5 min to 1 hour
        };
    }

    /**
     * Generate edge case test data
     */
    static generateEdgeCases(): {
        maxValues: any;
        minValues: any;
        invalidValues: any;
    } {
        return {
            maxValues: {
                amount: new BN(2).pow(new BN(63)).sub(new BN(1)),
                count: 4294967295, // Max u32
                percentage: 10000 // 100%
            },
            minValues: {
                amount: new BN(1), // Minimum 1 lamport
                count: 1,
                percentage: 0
            },
            invalidValues: {
                negativeAmount: new BN(-1),
                overflowCount: 4294967296, // u32 + 1
                invalidPercentage: 10001 // > 100%
            }
        };
    }
}

/**
 * Test Result Aggregator
 * GI #8: Achieve 100% test coverage
 */
export class TestResultAggregator {
    private results: Array<{
        suite: string;
        test: string;
        passed: boolean;
        duration: number;
        error?: string;
        metadata?: any;
    }>;

    constructor() {
        this.results = [];
    }

    addResult(suite: string, test: string, passed: boolean, duration: number, error?: string, metadata?: any): void {
        this.results.push({
            suite,
            test,
            passed,
            duration,
            error,
            metadata
        });
    }

    generateReport(): {
        summary: { total: number; passed: number; failed: number; coverage: number };
        details: any[];
        recommendations: string[];
    } {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        const coverage = total > 0 ? (passed / total) * 100 : 0;

        const recommendations: string[] = [];

        if (coverage < 100) {
            recommendations.push("Increase test coverage to 100% for production readiness");
        }

        const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
        if (avgDuration > 2000) {
            recommendations.push("Optimize test performance - average duration exceeds 2 seconds");
        }

        return {
            summary: { total, passed, failed, coverage },
            details: this.results,
            recommendations
        };
    }
}

// Export utility instances for easy import
export const createTransactionHelper = (connection: Connection, payer: Keypair) =>
    new TransactionHelper(connection, payer);

export const createAccountValidator = (connection: Connection) =>
    new AccountValidator(connection);

export const createPerformanceProfiler = () =>
    new PerformanceProfiler();

export const createSecurityTester = (connection: Connection) =>
    new SecurityTester(connection);

export const createTestResultAggregator = () =>
    new TestResultAggregator();
